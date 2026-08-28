import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { QuestionDefinition, ResponseInteraction } from '@/domain/qd/model'
import { isInteractionCorrect, isResponseCompleted } from './correctness'
import { blockingPredecessorId } from './dependencyGate'

interface RuntimeProgressValue {
  responses: Record<string, unknown>
  setResponse: (interactionId: string, raw: unknown) => void
  isCorrect: (interactionId: string) => boolean
  isCompleted: (interactionId: string) => boolean
  isUnlocked: (interactionId: string) => boolean
  blockingPredecessor: (
    interactionId: string
  ) => ResponseInteraction | undefined
}

const RuntimeProgressContext = createContext<RuntimeProgressValue | null>(null)

/** Tracks per-interaction responses and derives dependency gating from the QD's
 * `Dependency` constraints. A Required `RequiresCorrectness` dependency unlocks
 * its successor only when the predecessor is answered correctly; a Required
 * `RequiresCompletion` dependency unlocks it when the predecessor is answered. */
export function RuntimeProgressProvider({
  qd,
  children,
}: {
  qd: QuestionDefinition
  children: ReactNode
}) {
  const [responses, setResponses] = useState<Record<string, unknown>>({})

  const value = useMemo<RuntimeProgressValue>(() => {
    const interactionById = new Map(
      qd.responseInteractions.map((i) => [i.id, i])
    )

    const isCorrect = (id: string): boolean => {
      const interaction = interactionById.get(id)
      return interaction
        ? isInteractionCorrect(interaction, responses[id])
        : false
    }
    const isCompleted = (id: string): boolean =>
      isResponseCompleted(responses[id])

    const blockingPredecessor = (
      id: string
    ): ResponseInteraction | undefined => {
      const predecessorId = blockingPredecessorId(
        id,
        qd.constraints,
        isCorrect,
        isCompleted
      )
      return predecessorId ? interactionById.get(predecessorId) : undefined
    }

    return {
      responses,
      setResponse: (id, raw) =>
        setResponses((prev) => ({ ...prev, [id]: raw })),
      isCorrect,
      isCompleted,
      isUnlocked: (id) => blockingPredecessor(id) === undefined,
      blockingPredecessor,
    }
  }, [qd, responses])

  return (
    <RuntimeProgressContext.Provider value={value}>
      {children}
    </RuntimeProgressContext.Provider>
  )
}

export function useRuntimeProgress(): RuntimeProgressValue {
  const ctx = useContext(RuntimeProgressContext)
  if (!ctx)
    throw new Error(
      'useRuntimeProgress must be used within a RuntimeProgressProvider'
    )
  return ctx
}

/** Reports a widget's canonical raw response to the runtime so dependency
 * gating and correctness derive from live response state. */
export function useReportResponse(
  interactionId: string | undefined,
  raw: unknown
): void {
  const { setResponse } = useRuntimeProgress()
  const key = interactionId ? `${interactionId}:${JSON.stringify(raw)}` : ''
  useEffect(() => {
    if (interactionId) setResponse(interactionId, raw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

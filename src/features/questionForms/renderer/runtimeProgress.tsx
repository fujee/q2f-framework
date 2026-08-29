import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { QuestionDefinition } from '@/domain/qd/model'
import type {
  DependencyRealization,
  QuestionFormDefinition,
} from '@/domain/qfd/model'
import {
  isInteractionCorrect,
  isResponseCompleted,
  type RendererResponseAcceptance,
} from './correctness'
import {
  advanceDependencySatisfaction,
  interactionDependencyState,
} from './dependencyGate'

interface RuntimeProgressValue {
  responses: Record<string, unknown>
  setResponse: (interactionRef: string, raw: unknown) => void
  isCorrect: (interactionRef: string) => boolean
  isCompleted: (interactionRef: string) => boolean
  isAnswerable: (interactionRef: string) => boolean
  isExposed: (interactionRef: string) => boolean
  blockingDependencies: (
    interactionRef: string
  ) => readonly DependencyRealization[]
}

interface RuntimeState {
  responses: Record<string, unknown>
  satisfiedDependencies: ReadonlySet<string>
}

const RuntimeProgressContext = createContext<RuntimeProgressValue | null>(null)

/**
 * Executes only concrete qfd.dependencyRealizations. Satisfaction is retained
 * monotonically for the mounted runtime attempt; Sequence and
 * InteractionPrecedence never participate in availability or exposure.
 */
export function RuntimeProgressProvider({
  qd,
  qfd,
  responseAcceptance,
  children,
}: {
  qd: QuestionDefinition
  qfd: QuestionFormDefinition
  responseAcceptance?: RendererResponseAcceptance
  children: ReactNode
}) {
  const [runtime, setRuntime] = useState<RuntimeState>({
    responses: {},
    satisfiedDependencies: new Set(),
  })

  const value = useMemo<RuntimeProgressValue>(() => {
    const interactionById = new Map(
      qd.responseInteractions.map((interaction) => [
        interaction.id,
        interaction,
      ])
    )
    const realizationByInteractionRef = new Map(
      qfd.interactionRealizations.map((realization) => [
        realization.interactionRef,
        realization,
      ])
    )

    const completedFrom = (
      interactionRef: string,
      responses: Record<string, unknown>
    ): boolean => {
      const interaction = interactionById.get(interactionRef)
      const realization = realizationByInteractionRef.get(interactionRef)
      return Boolean(
        interaction &&
        realization &&
        isResponseCompleted(
          interaction,
          realization,
          responses[interactionRef],
          responseAcceptance
        )
      )
    }
    const correctFrom = (
      interactionRef: string,
      responses: Record<string, unknown>
    ): boolean => {
      const interaction = interactionById.get(interactionRef)
      const realization = realizationByInteractionRef.get(interactionRef)
      return Boolean(
        interaction &&
        realization &&
        isInteractionCorrect(
          interaction,
          realization,
          responses[interactionRef]
        )
      )
    }
    const stateFor = (interactionRef: string) =>
      interactionDependencyState(
        interactionRef,
        qfd.dependencyRealizations,
        runtime.satisfiedDependencies
      )

    return {
      responses: runtime.responses,
      setResponse: (interactionRef, raw) =>
        setRuntime((previous) => {
          const responses = {
            ...previous.responses,
            [interactionRef]: raw,
          }
          const satisfiedDependencies = advanceDependencySatisfaction(
            qfd.dependencyRealizations,
            previous.satisfiedDependencies,
            {
              isCompleted: (id) => completedFrom(id, responses),
              isCorrect: (id) => correctFrom(id, responses),
            }
          )
          return { responses, satisfiedDependencies }
        }),
      isCorrect: (interactionRef) =>
        correctFrom(interactionRef, runtime.responses),
      isCompleted: (interactionRef) =>
        completedFrom(interactionRef, runtime.responses),
      isAnswerable: (interactionRef) => stateFor(interactionRef).isAnswerable,
      isExposed: (interactionRef) => stateFor(interactionRef).isExposed,
      blockingDependencies: (interactionRef) =>
        stateFor(interactionRef).blockingDependencies,
    }
  }, [qd, qfd, responseAcceptance, runtime])

  return (
    <RuntimeProgressContext.Provider value={value}>
      {children}
    </RuntimeProgressContext.Provider>
  )
}

export function useRuntimeProgress(): RuntimeProgressValue {
  const context = useContext(RuntimeProgressContext)
  if (!context) {
    throw new Error(
      'useRuntimeProgress must be used within a RuntimeProgressProvider'
    )
  }
  return context
}

/** Reports renderer raw output; acceptance occurs centrally against QD/QFD. */
export function useReportResponse(
  interactionRef: string | undefined,
  raw: unknown
): void {
  const { setResponse } = useRuntimeProgress()
  const responseKey = interactionRef
    ? `${interactionRef}:${JSON.stringify(raw)}`
    : ''
  useEffect(() => {
    if (interactionRef) setResponse(interactionRef, raw)
    // setResponse is intentionally represented by responseKey for value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseKey])
}

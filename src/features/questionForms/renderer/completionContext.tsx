import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CompletingItemUsageLimit } from '@/domain/qd/model'
import {
  assignCompletionItem,
  removeCompletionItem,
  type CompletionAssignments,
} from './completionState'

interface CompletionContextValue {
  /** Full gap → item map (exposed for usage counting). */
  assignments: CompletionAssignments
  assignedItem: (gapId: string) => string | undefined
  assignItem: (
    gapId: string,
    itemId: string,
    usageLimit: CompletingItemUsageLimit
  ) => void
  removeItem: (gapId: string) => void
}

const CompletionContext = createContext<CompletionContextValue | null>(null)

/** Holds per-gap Completing assignments so the draggable option bank and the
 * individually placed drop-target gaps share one source of truth. */
export function CompletionProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<CompletionAssignments>({})

  const value = useMemo<CompletionContextValue>(
    () => ({
      assignments,
      assignedItem: (gapId) => assignments[gapId],
      assignItem: (gapId, itemId, usageLimit) =>
        setAssignments((prev) =>
          assignCompletionItem(prev, gapId, itemId, usageLimit)
        ),
      removeItem: (gapId) =>
        setAssignments((prev) => removeCompletionItem(prev, gapId)),
    }),
    [assignments]
  )

  return (
    <CompletionContext.Provider value={value}>
      {children}
    </CompletionContext.Provider>
  )
}

export function useCompletion(): CompletionContextValue {
  const ctx = useContext(CompletionContext)
  if (!ctx)
    throw new Error('useCompletion must be used within a CompletionProvider')
  return ctx
}

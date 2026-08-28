import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { nextSelection } from './selectionState'

interface SelectionContextValue {
  /** Whether `elementRef` is selected for the given interaction. */
  isSelected: (interactionId: string, elementRef: string) => boolean
  /** All selected element refs for the given interaction (order is incidental). */
  selectedIds: (interactionId: string) => string[]
  /** Toggles a selection slot for `interactionId`, respecting `maxSelections`. */
  toggle: (
    interactionId: string,
    elementRef: string,
    maxSelections: number
  ) => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

/** Holds per-interaction selection state so that both list-style widgets and
 * individually placed Choice blocks (SpatialSelection) share one source of
 * truth and honor the interaction's `maxSelections`. */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})

  const value = useMemo<SelectionContextValue>(
    () => ({
      isSelected: (interactionId, elementRef) =>
        selected[interactionId]?.has(elementRef) ?? false,
      selectedIds: (interactionId) =>
        Array.from(selected[interactionId] ?? new Set<string>()),
      toggle: (interactionId, elementRef, maxSelections) =>
        setSelected((prev) => ({
          ...prev,
          [interactionId]: nextSelection(
            prev[interactionId] ?? new Set<string>(),
            elementRef,
            maxSelections
          ),
        })),
    }),
    [selected]
  )

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext)
  if (!ctx)
    throw new Error('useSelection must be used within a SelectionProvider')
  return ctx
}

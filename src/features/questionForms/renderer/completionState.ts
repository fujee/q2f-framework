import type { CompletingItemUsageLimit } from '@/domain/qd/model'

/** Gap id → assigned completing-item id (undefined when empty). */
export type CompletionAssignments = Record<string, string | undefined>

/** Assigns `itemId` to `gapId`, enforcing the item's `usageLimit`. An item with
 * a finite limit can only occupy that many gaps at once; exceeding the limit
 * evicts it from the earliest-occupied other gap (a "move"). */
export function assignCompletionItem(
  current: CompletionAssignments,
  gapId: string,
  itemId: string,
  usageLimit: CompletingItemUsageLimit
): CompletionAssignments {
  if (current[gapId] === itemId) return current
  const next = { ...current }
  if (usageLimit !== 'Unlimited') {
    const occupied = Object.keys(next).filter(
      (g) => g !== gapId && next[g] === itemId
    )
    let excess = occupied.length - (usageLimit - 1)
    for (const g of occupied) {
      if (excess <= 0) break
      next[g] = undefined
      excess--
    }
  }
  next[gapId] = itemId
  return next
}

/** Clears the item assigned to `gapId`. */
export function removeCompletionItem(
  current: CompletionAssignments,
  gapId: string
): CompletionAssignments {
  return { ...current, [gapId]: undefined }
}

/** Extracts the answered `gapId → itemId` map for one interaction's gaps,
 * dropping empty gaps (the canonical Completing response shape). */
export function assignmentsForInteraction(
  assignments: CompletionAssignments,
  gapIds: string[]
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const gapId of gapIds) {
    const itemId = assignments[gapId]
    if (itemId) result[gapId] = itemId
  }
  return result
}

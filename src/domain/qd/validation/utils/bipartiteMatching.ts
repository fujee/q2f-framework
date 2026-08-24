/**
 * Kuhn's algorithm (augmenting-path bipartite matching), used to decide CMP-015:
 * whether every DropTargetGap can be assigned a distinct "usage slot" of an
 * acceptable CompletingItem without exceeding any item's usageLimit.
 *
 * Each item with usageLimit N is expanded into N independent slots (an
 * 'Unlimited' item gets one slot per gap, which is always sufficient). A perfect
 * matching that covers every gap means the assignment is feasible.
 */
export interface MatchableGap {
  gapId: string
  candidateItemIds: string[]
}

export function isAssignmentFeasible(
  gaps: MatchableGap[],
  itemUsageLimits: ReadonlyMap<string, number | 'Unlimited'>
): boolean {
  if (gaps.length === 0) return true

  const slots: string[] = [] // slots[slotIndex] = itemId
  for (const [itemId, limit] of itemUsageLimits) {
    const capacity = limit === 'Unlimited' ? gaps.length : Math.max(0, limit)
    for (let i = 0; i < capacity; i++) slots.push(itemId)
  }

  const slotOwner = new Array<number>(slots.length).fill(-1) // slotOwner[slotIndex] = gapIndex

  function tryAssign(gapIndex: number, visited: Set<number>): boolean {
    const gap = gaps[gapIndex]
    for (let s = 0; s < slots.length; s++) {
      if (visited.has(s)) continue
      if (!gap.candidateItemIds.includes(slots[s])) continue
      visited.add(s)
      if (slotOwner[s] === -1 || tryAssign(slotOwner[s], visited)) {
        slotOwner[s] = gapIndex
        return true
      }
    }
    return false
  }

  let matched = 0
  for (let g = 0; g < gaps.length; g++) {
    if (tryAssign(g, new Set())) matched++
  }
  return matched === gaps.length
}

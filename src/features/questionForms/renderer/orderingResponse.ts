export function moveOrderingItem(
  order: readonly string[],
  itemRef: string,
  offset: -1 | 1
): string[] {
  const index = order.indexOf(itemRef)
  const target = index + offset
  if (index < 0 || target < 0 || target >= order.length) return [...order]
  const next = [...order]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

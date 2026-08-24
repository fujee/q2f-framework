/** Pure selection reducer: toggles `elementRef` within `current`, enforcing
 * `maxSelections` (a value of 1 yields radio-like replacement). Exported for
 * unit testing — the web renderer must never create an invalid selection state. */
export function nextSelection(
  current: ReadonlySet<string>,
  elementRef: string,
  maxSelections: number
): Set<string> {
  const next = new Set(current)
  if (next.has(elementRef)) {
    next.delete(elementRef)
  } else if (maxSelections <= 1) {
    next.clear()
    next.add(elementRef)
  } else if (next.size < maxSelections) {
    next.add(elementRef)
  }
  return next
}

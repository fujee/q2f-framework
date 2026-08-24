/** Applies an ItemOrderPolicy to a list of items: Fixed keeps the authored
 * (base) order; Permutable returns a shuffled presentation order. Only the
 * order changes — element identity and set membership are preserved. */
export function applyItemOrderPolicy<T>(
  items: readonly T[],
  policy: 'Fixed' | 'Permutable'
): T[] {
  if (policy === 'Fixed') return [...items]
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

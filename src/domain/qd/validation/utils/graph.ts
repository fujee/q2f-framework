/**
 * Directed graph cycle detection, used for GRAPH-001 (Required edges must be
 * acyclic) and GRAPH-002 (Required+Preferred combined must not introduce a new
 * cycle beyond what GRAPH-001 already reports).
 */
export interface DirectedEdge {
  from: string
  to: string
}

/** Returns true if the directed graph described by `edges` over `nodes` contains a cycle. */
export function hasCycle(
  nodes: readonly string[],
  edges: readonly DirectedEdge[]
): boolean {
  const adjacency = new Map<string, string[]>()
  for (const node of nodes) adjacency.set(node, [])
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
    adjacency.get(edge.from)!.push(edge.to)
  }

  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()
  for (const node of adjacency.keys()) color.set(node, WHITE)

  function visit(node: string): boolean {
    color.set(node, GRAY)
    for (const next of adjacency.get(node) ?? []) {
      const state = color.get(next) ?? WHITE
      if (state === GRAY) return true
      if (state === WHITE && visit(next)) return true
    }
    color.set(node, BLACK)
    return false
  }

  for (const node of adjacency.keys()) {
    if (color.get(node) === WHITE && visit(node)) return true
  }
  return false
}

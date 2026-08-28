import type {
  LayoutElement,
  LayoutableRealizationRef,
  LayoutPlacement,
} from './model'

export interface LayoutTreeAnalysis {
  hasCycle: boolean
  hasSharedNode: boolean
  hasEmptyGroup: boolean
  placements: LayoutPlacement[]
}

export function analyzeLayoutTree(root: LayoutElement): LayoutTreeAnalysis {
  const active = new Set<LayoutElement>()
  const visited = new Set<LayoutElement>()
  const placements: LayoutPlacement[] = []
  let hasCycle = false
  let hasSharedNode = false
  let hasEmptyGroup = false

  function visit(node: LayoutElement): void {
    if (active.has(node)) {
      hasCycle = true
      return
    }
    if (visited.has(node)) {
      hasSharedNode = true
      return
    }
    visited.add(node)
    active.add(node)
    if (node.kind === 'LayoutPlacement') {
      placements.push(node)
    } else {
      if (node.children.length === 0) hasEmptyGroup = true
      node.children.forEach(visit)
    }
    active.delete(node)
  }

  visit(root)
  return { hasCycle, hasSharedNode, hasEmptyGroup, placements }
}

export function layoutableRefKey(ref: LayoutableRealizationRef): string {
  return `${ref.kind}::${ref.id}`
}

export function placementKeys(root: LayoutElement): string[] {
  return analyzeLayoutTree(root).placements.map(({ realizationRef }) =>
    layoutableRefKey(realizationRef)
  )
}

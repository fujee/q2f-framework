import type { Id, QuestionDefinition } from '../qd/model'
import type {
  ContainerElement,
  ContentElement,
  InlineItem,
  LayoutElement,
  QuestionFormDefinition,
  ResponseElementKind,
} from './model'

function childrenOf(node: LayoutElement): LayoutElement[] {
  switch (node.kind) {
    case 'Stack':
      return node.children
    case 'Grid':
      return node.items.map((i) => i.child)
    case 'Canvas':
      return node.items.map((i) => i.child)
    case 'Inline':
      return node.items.map((i) => i.child)
    default:
      return []
  }
}

/** Deterministic traversal in collection order (Section 13 / rules catalog Section
 * 7): Stack children order, Grid/Canvas/Inline items order. Geometry and Canvas
 * `layer` never affect this order. Cycle-safe: a cyclic/shared layout cannot be
 * traversed infinitely and simply contributes each reachable content node once. */
export function flattenLayout(root: ContainerElement): ContentElement[] {
  const result: ContentElement[] = []
  if (!root || typeof root !== 'object') return result
  const onStack = new Set<LayoutElement>()
  function visit(node: LayoutElement): void {
    if (onStack.has(node)) return // cycle guard
    onStack.add(node)
    if (
      node.kind === 'StimulusBlock' ||
      node.kind === 'InteractionBlock' ||
      node.kind === 'ResponseElementBlock'
    ) {
      result.push(node)
    } else {
      for (const child of childrenOf(node)) visit(child)
    }
    onStack.delete(node)
  }
  visit(root)
  return result
}

export interface LayoutTreeIssues {
  hasCycle: boolean
  /** Layout element objects reachable from more than one parent. */
  sharedNodes: LayoutElement[]
}

/** Detects cycles and shared node objects via reference identity, since the tree
 * is built from directly nested objects rather than ID-addressed nodes. */
export function analyzeLayoutTree(root: LayoutElement): LayoutTreeIssues {
  const onStack = new Set<LayoutElement>()
  const visited = new Set<LayoutElement>()
  const sharedNodes: LayoutElement[] = []
  let hasCycle = false

  function visit(node: LayoutElement): void {
    if (onStack.has(node)) {
      hasCycle = true
      return
    }
    if (visited.has(node)) {
      sharedNodes.push(node)
      return
    }
    visited.add(node)
    onStack.add(node)
    for (const child of childrenOf(node)) visit(child)
    onStack.delete(node)
  }

  visit(root)
  return { hasCycle, sharedNodes }
}

/** Finds the QD interaction that owns a given response element, so a
 * ResponseElementBlock's logical position can be attributed to its interaction. */
export function findOwningInteractionId(
  qd: QuestionDefinition,
  elementKind: ResponseElementKind,
  elementRef: Id
): Id | undefined {
  for (const interaction of qd.responseInteractions) {
    if (elementKind === 'Choice' && interaction.type === 'Selecting') {
      if (interaction.choices.some((c) => c.id === elementRef))
        return interaction.id
    }
    if (elementKind === 'OrderingItem' && interaction.type === 'Ordering') {
      if (interaction.orderingItems.some((i) => i.id === elementRef))
        return interaction.id
    }
    if (elementKind === 'RelatingElement' && interaction.type === 'Relating') {
      if (
        interaction.sourceSet.relatingElements.some(
          (e) => e.id === elementRef
        ) ||
        interaction.targetSet.relatingElements.some((e) => e.id === elementRef)
      )
        return interaction.id
    }
    if (elementKind === 'CompletingGap' && interaction.type === 'Completing') {
      if (interaction.completingGaps.some((g) => g.id === elementRef))
        return interaction.id
    }
  }
  return undefined
}

/** Maps each QD interaction id to every logical position (index into the flattened
 * layout) that belongs to its presentation: its InteractionBlock plus any
 * ResponseElementBlock it owns. */
export function presentationPositions(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): Map<Id, number[]> {
  const flat = flattenLayout(qfd.rootLayout)
  const positions = new Map<Id, number[]>()
  const addPos = (key: Id, index: number) => {
    const arr = positions.get(key)
    if (arr) arr.push(index)
    else positions.set(key, [index])
  }
  flat.forEach((node, index) => {
    if (node.kind === 'InteractionBlock') {
      const ir = qfd.interactionRealizations.find(
        (r) => r.id === node.interactionRealizationRef
      )
      if (ir) addPos(ir.interactionRef, index)
    } else if (node.kind === 'ResponseElementBlock') {
      const ownerId = findOwningInteractionId(
        qd,
        node.elementKind,
        node.elementRef
      )
      if (ownerId) addPos(ownerId, index)
    }
  })
  return positions
}

export function maxPosition(
  positions: Map<Id, number[]>,
  interactionId: Id
): number | undefined {
  const arr = positions.get(interactionId)
  return arr && arr.length > 0 ? Math.max(...arr) : undefined
}

export function minPosition(
  positions: Map<Id, number[]>,
  interactionId: Id
): number | undefined {
  const arr = positions.get(interactionId)
  return arr && arr.length > 0 ? Math.min(...arr) : undefined
}

/** Collects every container capability (Stack/Grid/Canvas/Inline) actually used
 * anywhere in the layout tree. */
export function collectUsedLayoutCapabilities(
  root: LayoutElement
): Set<'Stack' | 'Grid' | 'Canvas' | 'Inline'> {
  const used = new Set<'Stack' | 'Grid' | 'Canvas' | 'Inline'>()
  const visited = new Set<LayoutElement>()
  function visit(node: LayoutElement): void {
    if (!node || visited.has(node)) return
    visited.add(node)
    if (
      node.kind === 'Stack' ||
      node.kind === 'Grid' ||
      node.kind === 'Canvas' ||
      node.kind === 'Inline'
    ) {
      used.add(node.kind)
      for (const child of childrenOf(node)) visit(child)
    }
  }
  visit(root)
  return used
}

/** Finds the immediate parent container object of a target content node, located
 * by reference identity. Returns undefined if `target` is not reachable from `root`. */
export function findParentContainer(
  root: LayoutElement,
  target: LayoutElement
): ContainerElement | undefined {
  let found: ContainerElement | undefined
  const visited = new Set<LayoutElement>()
  function visit(
    node: LayoutElement,
    parent: ContainerElement | undefined
  ): void {
    if (found || !node || visited.has(node)) return
    visited.add(node)
    if (node === target) {
      found = parent
      return
    }
    if (
      node.kind === 'Stack' ||
      node.kind === 'Grid' ||
      node.kind === 'Canvas' ||
      node.kind === 'Inline'
    ) {
      for (const child of childrenOf(node)) visit(child, node)
    }
  }
  visit(root, undefined)
  return found
}

/** Finds the InlineItem wrapper for a target child node, if the target is placed
 * directly inside an Inline container (needed to read its `anchor`). */
export function findInlineItemFor(
  root: LayoutElement,
  target: LayoutElement
): InlineItem | undefined {
  let found: InlineItem | undefined
  const visited = new Set<LayoutElement>()
  function visit(node: LayoutElement): void {
    if (found || !node || visited.has(node)) return
    visited.add(node)
    if (node.kind === 'Inline') {
      for (const item of node.items) {
        if (item.child === target) {
          found = item
          return
        }
        visit(item.child)
      }
      return
    }
    for (const child of childrenOf(node)) visit(child)
  }
  visit(root)
  return found
}

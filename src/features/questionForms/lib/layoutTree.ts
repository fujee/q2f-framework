import type {
  Canvas,
  CanvasArea,
  ContainerElement,
  GridItem,
  Inline,
  LayoutElement,
  ResponseElementKind,
  Stack,
} from '@/domain/qfd/model'
import type { TextAnchor } from '@/domain/qd/model'

/** Addresses a container node purely by its position in the tree (index of the
 * child slot to descend into at each level), matching the domain model's
 * object-identity layout nodes, which carry no ids of their own. */
export type LayoutPath = number[]

export function childCount(container: ContainerElement): number {
  switch (container.kind) {
    case 'Stack':
      return container.children.length
    case 'Grid':
    case 'Canvas':
    case 'Inline':
      return container.items.length
  }
}

export function childAt(
  container: ContainerElement,
  index: number
): LayoutElement {
  switch (container.kind) {
    case 'Stack':
      return container.children[index]
    case 'Grid':
    case 'Canvas':
    case 'Inline':
      return container.items[index].child
  }
}

export function getContainerAtPath(
  root: ContainerElement,
  path: LayoutPath
): ContainerElement {
  let node: ContainerElement = root
  for (const index of path) {
    const child = childAt(node, index)
    if (!('items' in child || 'children' in child)) {
      throw new Error('Path does not resolve to a container')
    }
    node = child as ContainerElement
  }
  return node
}

/** Returns a new root with `updater` applied to the container found at `path`. */
export function updateContainerAtPath(
  root: ContainerElement,
  path: LayoutPath,
  updater: (container: ContainerElement) => ContainerElement
): ContainerElement {
  if (path.length === 0) return updater(root)
  const [head, ...rest] = path

  switch (root.kind) {
    case 'Stack': {
      const children = [...root.children]
      children[head] = updateContainerAtPath(
        children[head] as ContainerElement,
        rest,
        updater
      )
      return { ...root, children }
    }
    case 'Grid': {
      const items = [...root.items]
      items[head] = {
        ...items[head],
        child: updateContainerAtPath(
          items[head].child as ContainerElement,
          rest,
          updater
        ),
      }
      return { ...root, items }
    }
    case 'Canvas': {
      const items = [...root.items]
      items[head] = {
        ...items[head],
        child: updateContainerAtPath(
          items[head].child as ContainerElement,
          rest,
          updater
        ),
      }
      return { ...root, items }
    }
    case 'Inline': {
      const items = [...root.items]
      items[head] = {
        ...items[head],
        child: updateContainerAtPath(
          items[head].child as ContainerElement,
          rest,
          updater
        ),
      }
      return { ...root, items }
    }
  }
}

export interface NewGridSlot {
  row: number
  column: number
  rowSpan: number
  columnSpan: number
}

export interface NewCanvasSlot {
  area: CanvasArea
  layer: number
}

export interface NewInlineSlot {
  anchor?: TextAnchor
}

export function emptyContainer(
  kind: ContainerElement['kind']
): ContainerElement {
  switch (kind) {
    case 'Stack':
      return { kind: 'Stack', direction: 'Vertical', children: [] }
    case 'Grid':
      return { kind: 'Grid', rows: 1, columns: 1, items: [] }
    case 'Canvas':
      return { kind: 'Canvas', items: [] }
    case 'Inline':
      return { kind: 'Inline', items: [] }
  }
}

export function addChild(
  container: ContainerElement,
  child: LayoutElement,
  slot?: NewGridSlot | NewCanvasSlot | NewInlineSlot
): ContainerElement {
  switch (container.kind) {
    case 'Stack':
      return { ...container, children: [...container.children, child] }
    case 'Grid': {
      const s = (slot as NewGridSlot) ?? {
        row: 0,
        column: 0,
        rowSpan: 1,
        columnSpan: 1,
      }
      const item: GridItem = { child, ...s }
      return { ...container, items: [...container.items, item] }
    }
    case 'Canvas': {
      const s = (slot as NewCanvasSlot) ?? {
        area: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
        layer: container.items.length,
      }
      return { ...container, items: [...container.items, { child, ...s }] }
    }
    case 'Inline': {
      const s = slot as NewInlineSlot | undefined
      return {
        ...container,
        items: [...container.items, { child, anchor: s?.anchor }],
      }
    }
  }
}

export function removeChildAt(
  container: ContainerElement,
  index: number
): ContainerElement {
  switch (container.kind) {
    case 'Stack':
      return {
        ...container,
        children: container.children.filter((_, i) => i !== index),
      }
    case 'Grid':
      return {
        ...container,
        items: container.items.filter((_, i) => i !== index),
      }
    case 'Canvas':
      return {
        ...container,
        items: container.items.filter((_, i) => i !== index),
      }
    case 'Inline':
      return {
        ...container,
        items: container.items.filter((_, i) => i !== index),
      }
  }
}

/** Reorders a child within its parent (logical presentation order is the stored
 * item/child order, independent of Grid/Canvas geometry — Section 13). */
export function moveChild(
  container: ContainerElement,
  from: number,
  to: number
): ContainerElement {
  const count = childCount(container)
  const clampedTo = Math.max(0, Math.min(to, count - 1))
  if (from === clampedTo) return container
  switch (container.kind) {
    case 'Stack': {
      const children = [...container.children]
      const [item] = children.splice(from, 1)
      children.splice(clampedTo, 0, item)
      return { ...container, children }
    }
    case 'Grid': {
      const items = [...container.items]
      const [item] = items.splice(from, 1)
      items.splice(clampedTo, 0, item)
      return { ...container, items }
    }
    case 'Canvas': {
      const items = [...container.items]
      const [item] = items.splice(from, 1)
      items.splice(clampedTo, 0, item)
      return { ...container, items }
    }
    case 'Inline': {
      const items = [...container.items]
      const [item] = items.splice(from, 1)
      items.splice(clampedTo, 0, item)
      return { ...container, items }
    }
  }
}

export function updateGridItemSlot(
  container: ContainerElement,
  index: number,
  patch: Partial<NewGridSlot>
): ContainerElement {
  if (container.kind !== 'Grid') return container
  const items = [...container.items]
  items[index] = { ...items[index], ...patch }
  return { ...container, items }
}

export function updateCanvasItemSlot(
  container: ContainerElement,
  index: number,
  patch: Partial<NewCanvasSlot>
): ContainerElement {
  if (container.kind !== 'Canvas') return container
  const items = [...container.items]
  items[index] = { ...items[index], ...patch }
  return { ...container, items }
}

export function updateInlineItemAnchor(
  container: ContainerElement,
  index: number,
  anchor: TextAnchor | undefined
): ContainerElement {
  if (container.kind !== 'Inline') return container
  const items = [...container.items]
  items[index] = { ...items[index], anchor }
  return { ...container, items }
}

export function updateContainerProps(
  container: ContainerElement,
  patch:
    Partial<Stack> | Partial<Canvas> | Partial<Inline> | Record<string, unknown>
): ContainerElement {
  return { ...container, ...patch } as ContainerElement
}

/** Collects the refs of every ContentElement currently placed anywhere in the tree,
 * grouped by kind, so the layout editor can show which realizations/elements still
 * need placement. */
export interface PlacedRefs {
  stimulusRealizationRefs: string[]
  interactionRealizationRefs: string[]
  responseElements: { elementKind: ResponseElementKind; elementRef: string }[]
}

export function collectPlacedRefs(root: ContainerElement): PlacedRefs {
  const stimulusRealizationRefs: string[] = []
  const interactionRealizationRefs: string[] = []
  const responseElements: {
    elementKind: ResponseElementKind
    elementRef: string
  }[] = []

  function visit(node: LayoutElement) {
    switch (node.kind) {
      case 'Stack':
        node.children.forEach(visit)
        return
      case 'Grid':
        node.items.forEach((i) => visit(i.child))
        return
      case 'Canvas':
        node.items.forEach((i) => visit(i.child))
        return
      case 'Inline':
        node.items.forEach((i) => visit(i.child))
        return
      case 'StimulusBlock':
        stimulusRealizationRefs.push(node.stimulusRealizationRef)
        return
      case 'InteractionBlock':
        interactionRealizationRefs.push(node.interactionRealizationRef)
        return
      case 'ResponseElementBlock':
        responseElements.push({
          elementKind: node.elementKind,
          elementRef: node.elementRef,
        })
    }
  }

  visit(root)
  return {
    stimulusRealizationRefs,
    interactionRealizationRefs,
    responseElements,
  }
}

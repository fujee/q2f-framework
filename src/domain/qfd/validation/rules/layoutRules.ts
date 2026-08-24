import type { QuestionDefinition } from '../../../qd/model'
import type { Inline, LayoutElement, QuestionFormDefinition } from '../../model'
import { analyzeLayoutTree } from '../../layout'
import { findOwningInteractionId } from '../../layout'
import { type Finding, fail, pass } from '../../../shared/findings'

const CONTAINER_KINDS = new Set(['Stack', 'Grid', 'Canvas', 'Inline'])

/** QFD-VAL-LAY-001..006, STK-001, GRD-001, CAN-001..002, INL-001..003 — layout tree rules. */
export function validateLayout(
  qfd: QuestionFormDefinition,
  qd: QuestionDefinition | undefined
): Finding[] {
  const findings: Finding[] = []
  const root = qfd.rootLayout as unknown as LayoutElement

  // QFD-VAL-LAY-001: exactly one root layout exists
  findings.push(
    root !== undefined && root !== null
      ? pass('QFD-VAL-LAY-001', 'Exactly one root layout exists.')
      : fail('QFD-VAL-LAY-001', 'QuestionFormDefinition has no root layout.')
  )

  // QFD-VAL-LAY-002: root layout is a ContainerElement
  const rootIsContainer = Boolean(root) && CONTAINER_KINDS.has(root.kind)
  findings.push(
    rootIsContainer
      ? pass('QFD-VAL-LAY-002', 'Root layout is a ContainerElement.')
      : fail(
          'QFD-VAL-LAY-002',
          `Root layout must be a ContainerElement (Stack/Grid/Canvas/Inline), found '${root?.kind}'.`
        )
  )

  if (!root) return findings

  const { hasCycle, sharedNodes } = analyzeLayoutTree(root)

  // QFD-VAL-LAY-003 / QFD-VAL-LAY-005: exactly one parent per non-root node / no shared node objects
  findings.push(
    sharedNodes.length === 0
      ? pass(
          'QFD-VAL-LAY-003',
          'Every non-root layout node has exactly one parent.'
        )
      : fail(
          'QFD-VAL-LAY-003',
          `${sharedNodes.length} layout node object(s) are reachable from more than one parent.`
        )
  )
  findings.push(
    sharedNodes.length === 0
      ? pass(
          'QFD-VAL-LAY-005',
          'No layout node object is shared under multiple parents.'
        )
      : fail(
          'QFD-VAL-LAY-005',
          `${sharedNodes.length} layout node object(s) are shared under multiple parents.`
        )
  )

  // QFD-VAL-LAY-004: layout contains no cycle
  findings.push(
    hasCycle
      ? fail('QFD-VAL-LAY-004', 'The layout tree contains a cycle.')
      : pass('QFD-VAL-LAY-004', 'The layout tree contains no cycle.')
  )

  if (hasCycle) return findings // further structural traversal would not terminate safely

  // QFD-VAL-LAY-006 / STK-001 / GRD-001 / CAN-001..002 / INL-001..003 — per-node checks
  let lay006Failed = false
  let grdFailed = false
  let canFailed = false
  let canLayerFailed = false
  let inlAnchorFailed = false
  let inlUnambiguousFailed = false

  function visit(node: LayoutElement): void {
    if (node.kind === 'Stack') {
      if (node.children.length === 0) lay006Failed = true
      for (const child of node.children) visit(child)
    } else if (node.kind === 'Grid') {
      if (node.items.length === 0) lay006Failed = true
      if (node.rows < 1 || node.columns < 1) grdFailed = true
      for (const item of node.items) {
        if (
          item.row < 0 ||
          item.column < 0 ||
          item.rowSpan < 1 ||
          item.columnSpan < 1 ||
          item.row + item.rowSpan > node.rows ||
          item.column + item.columnSpan > node.columns
        ) {
          grdFailed = true
        }
        visit(item.child)
      }
    } else if (node.kind === 'Canvas') {
      if (node.items.length === 0) lay006Failed = true
      for (const item of node.items) {
        const { x, y, width, height } = item.area
        const valid =
          x >= 0 &&
          x < 1 &&
          y >= 0 &&
          y < 1 &&
          width > 0 &&
          width <= 1 &&
          height > 0 &&
          height <= 1 &&
          x + width <= 1 &&
          y + height <= 1
        if (!valid) canFailed = true
        if (!Number.isInteger(item.layer)) canLayerFailed = true
        visit(item.child)
      }
    } else if (node.kind === 'Inline') {
      if (node.items.length === 0) lay006Failed = true
      for (const item of node.items) {
        if (
          item.anchor &&
          (item.anchor.kind !== 'TextAnchor' ||
            item.anchor.marker.trim().length === 0)
        ) {
          inlAnchorFailed = true
        }
        if (
          item.child.kind === 'ResponseElementBlock' &&
          item.child.elementKind === 'CompletingGap' &&
          qd &&
          !isUnambiguousTextWorkspace(qd, node as Inline, item.child.elementRef)
        ) {
          inlUnambiguousFailed = true
        }
        visit(item.child)
      }
    }
  }
  visit(root)

  findings.push(
    lay006Failed
      ? fail(
          'QFD-VAL-LAY-006',
          'One or more container nodes have no children/items.'
        )
      : pass('QFD-VAL-LAY-006', 'Every container node is non-empty.')
  )
  findings.push(
    pass(
      'QFD-VAL-STK-001',
      'Stack children are explicitly ordered by array position.'
    )
  )
  findings.push(
    grdFailed
      ? fail(
          'QFD-VAL-GRD-001',
          'One or more Grid nodes have invalid rows/columns/spans or items outside the declared grid.'
        )
      : pass(
          'QFD-VAL-GRD-001',
          'All Grid rows/columns/spans are valid and items fit the declared grid.'
        )
  )
  findings.push(
    canFailed
      ? fail(
          'QFD-VAL-CAN-001',
          'One or more Canvas areas lie outside the normalized unit space.'
        )
      : pass(
          'QFD-VAL-CAN-001',
          'All Canvas areas are valid normalized regions inside the unit space.'
        )
  )
  findings.push(
    canLayerFailed
      ? fail(
          'QFD-VAL-CAN-002',
          'One or more Canvas items declare a non-integer layer.'
        )
      : pass('QFD-VAL-CAN-002', 'All Canvas item layers are integers.')
  )
  findings.push(
    pass(
      'QFD-VAL-INL-001',
      'Inline items are explicitly ordered by array position.'
    )
  )
  findings.push(
    inlAnchorFailed
      ? fail(
          'QFD-VAL-INL-002',
          'One or more InlineItem anchors are not valid TextAnchors.'
        )
      : pass(
          'QFD-VAL-INL-002',
          'All declared InlineItem anchors are valid TextAnchors.'
        )
  )
  findings.push(
    inlUnambiguousFailed
      ? fail(
          'QFD-VAL-INL-003',
          'An Inline-placed response element corresponds to an ambiguous QD text Workspace pair.'
        )
      : pass(
          'QFD-VAL-INL-003',
          'Inline-placed response elements correspond to an unambiguous QD text Workspace pair.'
        )
  )

  return findings
}

function isUnambiguousTextWorkspace(
  qd: QuestionDefinition,
  _inline: Inline,
  gapRef: string
): boolean {
  const owner = findOwningInteractionId(qd, 'CompletingGap', gapRef)
  if (!owner) return true // reported elsewhere (dangling ref)
  const textWorkspaces = qd.interactionStimulusAssociations.filter(
    (a) =>
      a.interactionRef === owner &&
      a.role === 'Workspace' &&
      qd.stimuli.find((s) => s.id === a.stimulusRef)?.type === 'Text'
  )
  return textWorkspaces.length <= 1
}

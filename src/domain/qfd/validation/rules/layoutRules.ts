import { fail, pass, type Finding } from '../../../shared/findings'
import {
  analyzeLayoutTree,
  layoutableRefKey,
  placementKeys,
} from '../../layout'
import type {
  ElementPresentation,
  InteractionRealization,
  LayoutElement,
  LayoutableRealizationRef,
  QuestionFormDefinition,
  SelectionPresentation,
} from '../../model'

export function validateLayout(qfd: QuestionFormDefinition): Finding[] {
  const findings: Finding[] = []
  const rootAnalysis = analyzeLayoutTree(qfd.rootLayout)
  const rootShapeValid =
    !rootAnalysis.hasCycle &&
    !rootAnalysis.hasSharedNode &&
    !rootAnalysis.hasEmptyGroup &&
    validOrientations(qfd.rootLayout)
  findings.push(
    rootShapeValid
      ? pass(
          'QFD-LAYOUT-001',
          'rootLayout is a finite non-empty baseline layout tree.'
        )
      : fail(
          'QFD-LAYOUT-001',
          'rootLayout must be acyclic, unshared, use baseline orientations, and contain no empty group.',
          { path: 'rootLayout' }
        )
  )

  const { independent, anchored } = collectOuterLayoutables(qfd)
  const independentKeys = independent.map(layoutableRefKey)
  const anchoredKeys = new Set(anchored.map(layoutableRefKey))
  const placedKeys = placementKeys(qfd.rootLayout)
  const placementValid =
    new Set(independentKeys).size === independentKeys.length &&
    placedKeys.length === independentKeys.length &&
    placedKeys.every((key) => independentKeys.includes(key)) &&
    independentKeys.every(
      (key) => placedKeys.filter((placed) => placed === key).length === 1
    ) &&
    placedKeys.every((key) => !anchoredKeys.has(key))
  findings.push(
    placementValid
      ? pass(
          'QFD-LAYOUT-002',
          'Outer layout positions every independent realization exactly once.'
        )
      : fail(
          'QFD-LAYOUT-002',
          'Outer placements must resolve to each independent realization exactly once and exclude anchored instances.',
          { path: 'rootLayout' }
        )
  )

  for (const composite of collectLocalComposites(qfd.interactionRealizations)) {
    findings.push(
      validateLocalComposite(composite.id, composite.layout, composite.owned)
    )
  }
  return findings
}

function validateLocalComposite(
  id: string,
  layout: LayoutElement,
  owned: ElementPresentation[]
): Finding {
  const analysis = analyzeLayoutTree(layout)
  const ownedKeys = owned.map(({ id: elementId }) =>
    layoutableRefKey(ref('ElementPresentation', elementId))
  )
  const placedKeys = placementKeys(layout)
  const valid =
    !analysis.hasCycle &&
    !analysis.hasSharedNode &&
    !analysis.hasEmptyGroup &&
    validOrientations(layout) &&
    new Set(ownedKeys).size === ownedKeys.length &&
    placedKeys.length === ownedKeys.length &&
    placedKeys.every((key) => ownedKeys.includes(key)) &&
    ownedKeys.every(
      (key) => placedKeys.filter((placed) => placed === key).length === 1
    )
  return valid
    ? pass(
        'QFD-LAYOUT-003',
        `Composite '${id}' localLayout covers exactly its owned presentations.`
      )
    : fail(
        'QFD-LAYOUT-003',
        `Composite '${id}' localLayout must contain all and only its owned ElementPresentations exactly once.`,
        { path: `localLayouts[${id}]` }
      )
}

function collectOuterLayoutables(qfd: QuestionFormDefinition): {
  independent: LayoutableRealizationRef[]
  anchored: LayoutableRealizationRef[]
} {
  const independent: LayoutableRealizationRef[] = qfd.stimulusRealizations.map(
    ({ id }) => ref('StimulusRealization', id)
  )
  const anchored: LayoutableRealizationRef[] = []

  for (const realization of qfd.interactionRealizations) {
    independent.push(
      ...realization.instructionRealizations.map(({ id }) =>
        ref('InstructionRealization', id)
      )
    )
    switch (realization.type) {
      case 'SelectingRealization':
        if (realization.standaloneSelection)
          independent.push(
            ref('SelectionPresentation', realization.standaloneSelection.id)
          )
        for (const workspace of realization.workspaceRealizations) {
          if (workspace.referencedResponseSite)
            independent.push(
              ref(
                'ResponseSiteRealization',
                workspace.referencedResponseSite.id
              )
            )
        }
        break
      case 'OrderingRealization':
        independent.push(
          ref('OrderingPresentation', realization.presentation.id)
        )
        break
      case 'RelatingRealization':
        independent.push(
          ref('RelatingSetPresentation', realization.sourceSetPresentation.id),
          ref('RelatingSetPresentation', realization.targetSetPresentation.id)
        )
        if (realization.notationResponseSite)
          independent.push(
            ref('ResponseSiteRealization', realization.notationResponseSite.id)
          )
        break
      case 'CompletingRealization':
        if (realization.itemSource)
          independent.push(
            ref('CompletingItemSourceRealization', realization.itemSource.id)
          )
        for (const gap of realization.gapRealizations) {
          if (gap.type === 'InputGapRealization') {
            const target = ref('ResponseSiteRealization', gap.responseSite.id)
            if (gap.responsePlacement === 'Referenced') independent.push(target)
            else anchored.push(target)
          } else if (gap.assignmentMode === 'ItemSelection') {
            if (gap.selectionPresentation) {
              const target = ref(
                'SelectionPresentation',
                gap.selectionPresentation.id
              )
              if (gap.responsePlacement === 'Referenced')
                independent.push(target)
              else anchored.push(target)
            }
          } else if (gap.referencedPlacementSite) {
            independent.push(
              ref('ResponseSiteRealization', gap.referencedPlacementSite.id)
            )
          }
        }
        break
      case 'ShortInputRealization':
      case 'EssayRealization':
        independent.push(
          ref('ResponseSiteRealization', realization.responseSite.id)
        )
        break
      case 'ArtifactSubmissionRealization':
        independent.push(
          ref('ResponseSiteRealization', realization.submissionSite.id)
        )
        break
      case 'MarkingRealization':
        break
    }
  }
  return { independent, anchored }
}

function collectLocalComposites(
  realizations: InteractionRealization[]
): Array<{ id: string; layout: LayoutElement; owned: ElementPresentation[] }> {
  const composites: Array<{
    id: string
    layout: LayoutElement
    owned: ElementPresentation[]
  }> = []
  const addSelection = (selection: SelectionPresentation | undefined) => {
    if (selection)
      composites.push({
        id: selection.id,
        layout: selection.localLayout,
        owned: selection.optionPresentations,
      })
  }
  for (const realization of realizations) {
    switch (realization.type) {
      case 'SelectingRealization':
        addSelection(realization.standaloneSelection)
        break
      case 'OrderingRealization':
        composites.push({
          id: realization.presentation.id,
          layout: realization.presentation.localLayout,
          owned: realization.presentation.itemPresentations,
        })
        break
      case 'RelatingRealization':
        for (const presentation of [
          realization.sourceSetPresentation,
          realization.targetSetPresentation,
        ])
          composites.push({
            id: presentation.id,
            layout: presentation.localLayout,
            owned: presentation.elementPresentations,
          })
        break
      case 'CompletingRealization':
        if (realization.itemSource)
          composites.push({
            id: realization.itemSource.id,
            layout: realization.itemSource.localLayout,
            owned: realization.itemSource.itemPresentations,
          })
        realization.gapRealizations.forEach((gap) => {
          if (gap.type === 'ItemGapRealization')
            addSelection(gap.selectionPresentation)
        })
        break
      default:
        break
    }
  }
  return composites
}

function validOrientations(root: LayoutElement): boolean {
  if (root.kind === 'LayoutPlacement') return true
  return (
    ['Horizontal', 'Vertical'].includes(root.orientation) &&
    root.children.every(validOrientations)
  )
}

function ref(
  kind: LayoutableRealizationRef['kind'],
  id: string
): LayoutableRealizationRef {
  return { kind, id }
}

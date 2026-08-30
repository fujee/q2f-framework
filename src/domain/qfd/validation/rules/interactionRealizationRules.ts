import type {
  Completing,
  CompletingGap,
  Relating,
  ResponseInteraction,
  Selecting,
} from '../../../qd/model'
import { fail, pass, type Finding } from '../../../shared/findings'
import type {
  CompletingRealization,
  ElementPresentation,
  InteractionRealization,
  QuestionFormDefinition,
  RelatingRealization,
  ResponseElementRef,
  SelectingRealization,
} from '../../model'
import type { QfdValidationContext } from '../context'

export function validateInteractionRealizations(
  qfd: QuestionFormDefinition,
  context: QfdValidationContext
): Finding[] {
  return qfd.interactionRealizations.map((realization) => {
    const interaction = context.interactionsById.get(realization.interactionRef)
    const valid = Boolean(
      interaction && validateRealization(realization, interaction, context)
    )
    return valid
      ? pass(
          'QFD-TYPE-001',
          `Realization for '${realization.interactionRef}' satisfies its type-specific structure.`
        )
      : fail(
          'QFD-TYPE-001',
          `Realization for '${realization.interactionRef}' violates its type-specific structure.`,
          {
            path: `interactionRealizations[${realization.interactionRef}]`,
            affectedIds: [realization.interactionRef],
          }
        )
  })
}

function validateRealization(
  realization: InteractionRealization,
  interaction: ResponseInteraction,
  context: QfdValidationContext
): boolean {
  if (!locallyUniqueInstanceIds(realization)) return false
  switch (realization.type) {
    case 'SelectingRealization':
      return (
        interaction.type === 'Selecting' &&
        validateSelecting(realization, interaction, context)
      )
    case 'OrderingRealization':
      return (
        interaction.type === 'Ordering' &&
        ['DirectOrdering', 'OrderNotation'].includes(realization.mode) &&
        exactPresentations(
          realization.presentation.itemPresentations,
          interaction.orderingItems.map(({ id }) => ({
            kind: 'OrderingItem',
            interactionRef: interaction.id,
            orderingItemRef: id,
          }))
        )
      )
    case 'RelatingRealization':
      return (
        interaction.type === 'Relating' &&
        validateRelating(realization, interaction)
      )
    case 'CompletingRealization':
      return (
        interaction.type === 'Completing' &&
        validateCompleting(realization, interaction, context)
      )
    case 'ShortInputRealization':
      return (
        interaction.type === 'ShortInput' &&
        nonEmptyId(realization.responseSite.id)
      )
    case 'EssayRealization':
      return (
        interaction.type === 'Essay' && nonEmptyId(realization.responseSite.id)
      )
    case 'ArtifactSubmissionRealization':
      return (
        interaction.type === 'ArtifactSubmission' &&
        ['DigitalSubmission', 'PhysicalSubmission'].includes(
          realization.submissionMode
        ) &&
        nonEmptyId(realization.submissionSite.id)
      )
    case 'MarkingRealization':
      if (interaction.type !== 'Marking') return false
      return validateMarking(
        realization.workspaceRealizationRef,
        interaction.id,
        context
      )
  }
}

function validateSelecting(
  realization: SelectingRealization,
  interaction: Selecting,
  context: QfdValidationContext
): boolean {
  const standaloneChoices = interaction.choices.filter(
    ({ workspaceStimulusRef }) => workspaceStimulusRef === undefined
  )
  const workspaceChoices = interaction.choices.filter(
    ({ workspaceStimulusRef }) => workspaceStimulusRef !== undefined
  )
  const standaloneValid =
    standaloneChoices.length === 0
      ? realization.standaloneSelection === undefined
      : Boolean(
          realization.standaloneSelection &&
          ['Expanded', 'Collapsed'].includes(
            realization.standaloneSelection.mode
          ) &&
          exactPresentations(
            realization.standaloneSelection.optionPresentations,
            standaloneChoices.map(({ id }) => ({
              kind: 'Choice',
              interactionRef: interaction.id,
              choiceRef: id,
            }))
          )
        )

  const seenChoices: string[] = []
  const workspacesValid = realization.workspaceRealizations.every(
    (workspace) => {
      const sr = context.stimulusRealization(workspace.stimulusRealizationRef)
      const choiceIds = workspace.choiceRealizations.map(
        ({ choiceRef }) => choiceRef
      )
      seenChoices.push(...choiceIds)
      const choicesMatch = workspace.choiceRealizations.every(({ choiceRef }) =>
        workspaceChoices.some(
          (choice) =>
            choice.id === choiceRef &&
            choice.workspaceStimulusRef === sr?.stimulusRef
        )
      )
      const cardinalityValid =
        workspace.mode === 'DirectSelection'
          ? workspace.referencedResponseSite === undefined
          : workspace.mode === 'ReferencedSelection' &&
            Boolean(workspace.referencedResponseSite?.id)
      return (
        choiceIds.length > 0 &&
        new Set(choiceIds).size === choiceIds.length &&
        choicesMatch &&
        workspace.choiceRealizations.every(({ realizationAnchor }) =>
          validAnchor(realizationAnchor)
        ) &&
        Boolean(
          sr &&
          context.serves(
            workspace.stimulusRealizationRef,
            sr.stimulusRef,
            interaction.id
          )
        ) &&
        cardinalityValid
      )
    }
  )
  const expectedWorkspaceChoices = workspaceChoices.map(({ id }) => id).sort()
  return (
    standaloneValid &&
    workspacesValid &&
    JSON.stringify(seenChoices.sort()) ===
      JSON.stringify(expectedWorkspaceChoices)
  )
}

function validateMarking(
  workspaceRealizationRef: string,
  interactionId: string,
  context: QfdValidationContext
): boolean {
  const workspaceAssociations = context.qd.associations.filter(
    ({ interactionRef, role }) =>
      interactionRef === interactionId && role === 'Workspace'
  )
  if (workspaceAssociations.length !== 1) return false
  const [{ stimulusRef }] = workspaceAssociations
  const concreteSurfaces = context.qfd.stimulusRealizations.filter(
    (realization) =>
      realization.stimulusRef === stimulusRef &&
      realization.servedInteractionRefs.includes(interactionId)
  )
  return (
    concreteSurfaces.length === 1 &&
    concreteSurfaces[0].id === workspaceRealizationRef
  )
}

function validateRelating(
  realization: RelatingRealization,
  interaction: Relating
): boolean {
  const modeValid =
    realization.mode === 'DirectRelationConstruction'
      ? realization.notationResponseSite === undefined
      : realization.mode === 'RelationNotation' &&
        Boolean(realization.notationResponseSite?.id)
  return (
    modeValid &&
    exactPresentations(
      realization.sourceSetPresentation.elementPresentations,
      interaction.sourceSet.relatingElements.map(({ id }) => ({
        kind: 'RelatingElement',
        interactionRef: interaction.id,
        set: 'Source',
        relatingElementRef: id,
      }))
    ) &&
    exactPresentations(
      realization.targetSetPresentation.elementPresentations,
      interaction.targetSet.relatingElements.map(({ id }) => ({
        kind: 'RelatingElement',
        interactionRef: interaction.id,
        set: 'Target',
        relatingElementRef: id,
      }))
    )
  )
}

function validateCompleting(
  realization: CompletingRealization,
  interaction: Completing,
  context: QfdValidationContext
): boolean {
  const gapIds = realization.gapRealizations.map(({ gapRef }) => gapRef)
  const expectedGapIds = interaction.completingGaps.map(({ id }) => id)
  if (!sameSet(gapIds, expectedGapIds)) return false

  const gapsValid = realization.gapRealizations.every((gapRealization) => {
    const gap = interaction.completingGaps.find(
      ({ id }) => id === gapRealization.gapRef
    )
    if (
      !gap ||
      !validAnchor(gapRealization.realizationAnchor) ||
      !context.serves(
        gapRealization.stimulusRealizationRef,
        gap.workspaceStimulusRef,
        interaction.id
      )
    )
      return false
    return validateGap(gapRealization, gap, interaction)
  })

  const needsItemSource = realization.gapRealizations.some(
    (gap) =>
      gap.type === 'ItemGapRealization' &&
      gap.assignmentMode === 'DirectPlacement'
  )
  const itemSourceValid = needsItemSource
    ? Boolean(
        realization.itemSource &&
        exactPresentations(
          realization.itemSource.itemPresentations,
          interaction.completingItems.map(({ id }) => ({
            kind: 'CompletingItem',
            interactionRef: interaction.id,
            completingItemRef: id,
          }))
        )
      )
    : realization.itemSource === undefined
  return gapsValid && itemSourceValid
}

function validateGap(
  realization: CompletingRealization['gapRealizations'][number],
  gap: CompletingGap,
  interaction: Completing
): boolean {
  if (!['Embedded', 'Referenced'].includes(realization.responsePlacement))
    return false
  if (realization.type === 'InputGapRealization') {
    return gap.type === 'InputGap' && nonEmptyId(realization.responseSite.id)
  }
  if (gap.type !== 'ItemGap') return false
  if (
    !['DirectPlacement', 'ItemSelection'].includes(realization.assignmentMode)
  )
    return false
  if (realization.assignmentMode === 'ItemSelection') {
    return Boolean(
      realization.selectionPresentation &&
      realization.referencedPlacementSite === undefined &&
      exactPresentations(
        realization.selectionPresentation.optionPresentations,
        interaction.completingItems.map(({ id }) => ({
          kind: 'CompletingItem',
          interactionRef: interaction.id,
          completingItemRef: id,
        }))
      )
    )
  }
  return (
    realization.selectionPresentation === undefined &&
    (realization.responsePlacement === 'Embedded'
      ? realization.referencedPlacementSite === undefined
      : Boolean(realization.referencedPlacementSite?.id))
  )
}

function exactPresentations(
  presentations: ElementPresentation[],
  expected: ResponseElementRef[]
): boolean {
  const ids = presentations.map(({ id }) => id)
  const actualKeys = presentations.map(({ elementRef }) =>
    elementRefKey(elementRef)
  )
  const expectedKeys = expected.map(elementRefKey)
  return (
    presentations.length > 0 &&
    ids.every(nonEmptyId) &&
    new Set(ids).size === ids.length &&
    sameSet(actualKeys, expectedKeys)
  )
}

function elementRefKey(ref: ResponseElementRef): string {
  switch (ref.kind) {
    case 'Choice':
      return `${ref.kind}::${ref.interactionRef}::${ref.choiceRef}`
    case 'OrderingItem':
      return `${ref.kind}::${ref.interactionRef}::${ref.orderingItemRef}`
    case 'RelatingElement':
      return `${ref.kind}::${ref.interactionRef}::${ref.set}::${ref.relatingElementRef}`
    case 'CompletingItem':
      return `${ref.kind}::${ref.interactionRef}::${ref.completingItemRef}`
  }
}

function sameSet(actual: string[], expected: string[]): boolean {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    actual.every((value) => expected.includes(value))
  )
}

function locallyUniqueInstanceIds(
  realization: InteractionRealization
): boolean {
  const keys = realization.instructionRealizations.map(
    ({ id }) => `InstructionRealization::${id}`
  )
  const add = (kind: string, id: string) => keys.push(`${kind}::${id}`)
  switch (realization.type) {
    case 'SelectingRealization':
      if (realization.standaloneSelection)
        add('SelectionPresentation', realization.standaloneSelection.id)
      realization.workspaceRealizations.forEach((workspace) => {
        if (workspace.referencedResponseSite)
          add('ResponseSiteRealization', workspace.referencedResponseSite.id)
      })
      break
    case 'OrderingRealization':
      add('OrderingPresentation', realization.presentation.id)
      break
    case 'RelatingRealization':
      add('RelatingSetPresentation', realization.sourceSetPresentation.id)
      add('RelatingSetPresentation', realization.targetSetPresentation.id)
      if (realization.notationResponseSite)
        add('ResponseSiteRealization', realization.notationResponseSite.id)
      break
    case 'CompletingRealization':
      if (realization.itemSource)
        add('CompletingItemSourceRealization', realization.itemSource.id)
      realization.gapRealizations.forEach((gap) => {
        if (gap.type === 'InputGapRealization')
          add('ResponseSiteRealization', gap.responseSite.id)
        if (gap.type === 'ItemGapRealization') {
          if (gap.selectionPresentation)
            add('SelectionPresentation', gap.selectionPresentation.id)
          if (gap.referencedPlacementSite)
            add('ResponseSiteRealization', gap.referencedPlacementSite.id)
        }
      })
      break
    case 'ShortInputRealization':
    case 'EssayRealization':
      add('ResponseSiteRealization', realization.responseSite.id)
      break
    case 'ArtifactSubmissionRealization':
      add('ResponseSiteRealization', realization.submissionSite.id)
      break
    case 'MarkingRealization':
      break
  }
  return (
    keys.every((key) => nonEmptyId(key.slice(key.indexOf('::') + 2))) &&
    new Set(keys).size === keys.length
  )
}

function validAnchor(
  anchor: import('../../model').RealizationAnchor | undefined
): boolean {
  return (
    anchor === undefined ||
    anchor.kind === 'TextRealizationAnchor' ||
    anchor.kind === 'RegionRealizationAnchor'
  )
}

function nonEmptyId(id: string): boolean {
  return id.trim().length > 0
}

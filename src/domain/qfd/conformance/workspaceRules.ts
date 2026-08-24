import type { Completing, QuestionDefinition, Selecting } from '../../qd/model'
import type {
  ContentElement,
  QuestionFormDefinition,
  ResponseElementBlock,
} from '../model'
import { MECHANISM_DESCRIPTORS } from '../mechanisms/registry'
import {
  findInlineItemFor,
  findOwningInteractionId,
  findParentContainer,
  flattenLayout,
} from '../layout'
import { type Finding, fail, pass, reviewRequired } from '../../shared/findings'

/** Whether a ResponseElementBlock's placement resolves to a concrete spatial/inline
 * position, as opposed to merely floating in an undifferentiated Stack. */
function hasConcretePlacement(
  qfd: QuestionFormDefinition,
  block: ContentElement
): boolean {
  const container = findParentContainer(qfd.rootLayout, block)
  if (!container) return false
  if (container.kind === 'Canvas' || container.kind === 'Grid') return true
  if (container.kind === 'Inline') {
    const item = findInlineItemFor(qfd.rootLayout, block)
    return Boolean(item?.anchor)
  }
  return false
}

function isIntegratedWorkspace(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  interactionId: string,
  stimulusId: string,
  blocks: ContentElement[]
): boolean {
  const ir = qfd.interactionRealizations.find(
    (r) => r.interactionRef === interactionId
  )
  const sr = qfd.stimulusRealizations.find((r) => r.stimulusRef === stimulusId)
  if (!ir || !sr) return false
  const descriptor = MECHANISM_DESCRIPTORS[ir.mechanism]

  if (descriptor.requiresElementLevelPlacement) {
    return blocks.some(
      (b) =>
        b.kind === 'ResponseElementBlock' &&
        findOwningInteractionId(qd, b.elementKind, b.elementRef) ===
          interactionId
    )
  }

  const interactionBlock = blocks.find(
    (b) =>
      b.kind === 'InteractionBlock' && b.interactionRealizationRef === ir.id
  )
  const stimulusBlocks = blocks.filter(
    (b) => b.kind === 'StimulusBlock' && b.stimulusRealizationRef === sr.id
  )
  if (!interactionBlock) return false
  const interactionParent = findParentContainer(
    qfd.rootLayout,
    interactionBlock
  )
  return stimulusBlocks.some(
    (sb) => findParentContainer(qfd.rootLayout, sb) === interactionParent
  )
}

/** CONF-ROLE-WRK-001..002, CONF-WRK-PLAC-001, CONF-WRK-SEL-001..004,
 * CONF-CMP-PLAC-001..004, CONF-MRK-001. */
export function validateWorkspaceConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): Finding[] {
  const findings: Finding[] = []
  const blocks = flattenLayout(qfd.rootLayout)

  for (const assoc of qd.interactionStimulusAssociations) {
    if (assoc.role !== 'Workspace') continue
    const interaction = qd.responseInteractions.find(
      (i) => i.id === assoc.interactionRef
    )
    if (!interaction) continue
    const integrated = isIntegratedWorkspace(
      qd,
      qfd,
      assoc.interactionRef,
      assoc.stimulusRef,
      blocks
    )

    findings.push(
      integrated
        ? pass(
            'CONF-ROLE-WRK-001',
            `Workspace association '${assoc.id}' is realized through an integrated mechanism/layout structure.`,
            {
              affectedIds: [assoc.id],
            }
          )
        : fail(
            'CONF-ROLE-WRK-001',
            `Workspace association '${assoc.id}' is not realized through an integrated structure.`,
            {
              affectedIds: [assoc.id],
            }
          )
    )
    findings.push(
      integrated
        ? pass(
            'CONF-ROLE-WRK-002',
            `Workspace association '${assoc.id}' was verified beyond mere co-presence.`,
            { affectedIds: [assoc.id] }
          )
        : fail(
            'CONF-ROLE-WRK-002',
            `Workspace association '${assoc.id}' relies on co-presence alone, which is not sufficient.`,
            {
              affectedIds: [assoc.id],
            }
          )
    )

    const ir = qfd.interactionRealizations.find(
      (r) => r.interactionRef === assoc.interactionRef
    )
    const descriptor = ir ? MECHANISM_DESCRIPTORS[ir.mechanism] : undefined

    if (ir && descriptor?.requiresElementLevelPlacement) {
      const elementKind =
        interaction.type === 'Selecting'
          ? 'Choice'
          : interaction.type === 'Completing'
            ? 'CompletingGap'
            : undefined
      const elementIds = collectPlaceableElementIds(interaction)
      const interactionBlock = blocks.find(
        (b) =>
          b.kind === 'InteractionBlock' && b.interactionRealizationRef === ir.id
      )
      const compositionContainer = interactionBlock
        ? findParentContainer(qfd.rootLayout, interactionBlock)
        : undefined
      // Every block in the same integrated composition, regardless of true ownership —
      // needed so a foreign element (CONF-WRK-SEL-003) can actually be detected.
      const compositionBlocks: ResponseElementBlock[] = compositionContainer
        ? blocks.filter(
            (b): b is ResponseElementBlock =>
              b.kind === 'ResponseElementBlock' &&
              b.elementKind === elementKind &&
              findParentContainer(qfd.rootLayout, b) === compositionContainer
          )
        : []
      const compositionIds = new Set(compositionBlocks.map((b) => b.elementRef))
      const allPlaced = elementIds.every((id) => compositionIds.has(id))
      const allConcrete = compositionBlocks.every((b) =>
        hasConcretePlacement(qfd, b)
      )
      findings.push(
        allPlaced && allConcrete
          ? pass(
              'CONF-WRK-PLAC-001',
              `All required response elements of '${interaction.code}' have concrete QFD placement.`,
              {
                affectedIds: [interaction.id],
              }
            )
          : fail(
              'CONF-WRK-PLAC-001',
              `One or more required response elements of '${interaction.code}' lack concrete QFD placement.`,
              {
                affectedIds: [interaction.id],
              }
            )
      )

      if (interaction.type === 'Selecting') {
        findings.push(
          ...validateSelectingWorkspace(
            interaction,
            compositionBlocks,
            allPlaced,
            allConcrete
          )
        )
      }
    }
  }

  findings.push(...validateCompletingPlacement(qd, qfd, blocks))
  findings.push(...validateMarkingIntegration(qd, qfd, blocks))

  return findings
}

function collectPlaceableElementIds(
  interaction: QuestionDefinition['responseInteractions'][number]
): string[] {
  if (interaction.type === 'Selecting')
    return interaction.choices.map((c) => c.id)
  if (interaction.type === 'Completing')
    return interaction.completingGaps.map((g) => g.id)
  return []
}

function validateSelectingWorkspace(
  interaction: Selecting,
  placedBlocks: ResponseElementBlock[],
  allPlaced: boolean,
  allConcrete: boolean
): Finding[] {
  const findings: Finding[] = []

  // CONF-WRK-SEL-001: every QD Choice is included in the integrated Workspace composition
  findings.push(
    allPlaced
      ? pass(
          'CONF-WRK-SEL-001',
          `All Choices of '${interaction.code}' are included in the integrated Workspace composition.`,
          {
            affectedIds: [interaction.id],
          }
        )
      : fail(
          'CONF-WRK-SEL-001',
          `One or more Choices of '${interaction.code}' are missing from the integrated Workspace composition.`,
          {
            affectedIds: [interaction.id],
          }
        )
  )

  // CONF-WRK-SEL-002: concrete placement provided for every Choice
  findings.push(
    allConcrete
      ? pass(
          'CONF-WRK-SEL-002',
          `Every Choice of '${interaction.code}' has concrete placement.`,
          { affectedIds: [interaction.id] }
        )
      : fail(
          'CONF-WRK-SEL-002',
          `One or more Choices of '${interaction.code}' lack concrete placement.`,
          { affectedIds: [interaction.id] }
        )
  )

  // CONF-WRK-SEL-003: no foreign response element pretending to belong to this Selecting interaction
  const choiceIds = new Set(interaction.choices.map((c) => c.id))
  const foreign = placedBlocks.filter((b) => !choiceIds.has(b.elementRef))
  findings.push(
    foreign.length === 0
      ? pass(
          'CONF-WRK-SEL-003',
          `The integrated Workspace composition for '${interaction.code}' contains no foreign response element.`,
          {
            affectedIds: [interaction.id],
          }
        )
      : fail(
          'CONF-WRK-SEL-003',
          `The integrated Workspace composition for '${interaction.code}' contains a foreign response element.`,
          {
            affectedIds: [interaction.id],
          }
        )
  )

  // CONF-WRK-SEL-004: semantic correctness of Choice-to-position mapping cannot be proven structurally
  findings.push(
    reviewRequired(
      'CONF-WRK-SEL-004',
      `Semantic correctness of the Choice-to-position mapping for '${interaction.code}' requires human review.`,
      { affectedIds: [interaction.id] }
    )
  )

  return findings
}

function validateCompletingPlacement(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  blocks: ContentElement[]
): Finding[] {
  const findings: Finding[] = []

  for (const interaction of qd.responseInteractions) {
    if (interaction.type !== 'Completing') continue
    const completing: Completing = interaction

    for (const gap of completing.completingGaps) {
      const gapBlock = blocks.find(
        (b) =>
          b.kind === 'ResponseElementBlock' &&
          b.elementKind === 'CompletingGap' &&
          b.elementRef === gap.id
      )
      const sr = gap.stimulusRef
        ? qfd.stimulusRealizations.find(
            (r) => r.stimulusRef === gap.stimulusRef
          )
        : undefined

      // CONF-CMP-PLAC-001: an applicable concrete QD anchor may be reused when the host is reused
      if (gap.stimulusRef && gap.anchor && sr?.mode === 'ReuseSource') {
        findings.push(
          pass(
            'CONF-CMP-PLAC-001',
            `Concrete QD anchor for gap '${gap.code}' is reused with its ReuseSource host.`,
            { affectedIds: [gap.id] }
          )
        )
      }

      // CONF-CMP-PLAC-002: placementSpecification without a concrete anchor requires concrete QFD placement
      if (gap.placementSpecification && !gap.anchor) {
        const concrete = Boolean(
          gapBlock && hasConcretePlacement(qfd, gapBlock)
        )
        findings.push(
          concrete
            ? pass(
                'CONF-CMP-PLAC-002',
                `Gap '${gap.code}' resolves placementSpecification to concrete QFD placement.`,
                {
                  affectedIds: [gap.id],
                }
              )
            : fail(
                'CONF-CMP-PLAC-002',
                `Gap '${gap.code}' has a placementSpecification but no concrete QFD placement.`,
                {
                  affectedIds: [gap.id],
                }
              )
        )
      }

      // CONF-CMP-PLAC-003/004: adapted/materialized host requires concrete QFD placement, reviewable
      if (
        sr &&
        (sr.mode === 'AdaptSource' ||
          sr.mode === 'MaterializeFromSpecification')
      ) {
        const concrete = Boolean(
          gapBlock && hasConcretePlacement(qfd, gapBlock)
        )
        findings.push(
          concrete
            ? pass(
                'CONF-CMP-PLAC-003',
                `Gap '${gap.code}' has concrete QFD placement after host ${sr.mode}.`,
                { affectedIds: [gap.id] }
              )
            : fail(
                'CONF-CMP-PLAC-003',
                `Gap '${gap.code}' lacks concrete QFD placement after host ${sr.mode}.`,
                { affectedIds: [gap.id] }
              )
        )
        if (concrete) {
          findings.push(
            reviewRequired(
              'CONF-CMP-PLAC-004',
              `Semantic correctness of the resolved placement for gap '${gap.code}' requires human review.`,
              {
                affectedIds: [gap.id],
              }
            )
          )
        }
      }
    }
  }

  return findings
}

function validateMarkingIntegration(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  blocks: ContentElement[]
): Finding[] {
  const findings: Finding[] = []

  for (const interaction of qd.responseInteractions) {
    if (interaction.type !== 'Marking') continue
    const ir = qfd.interactionRealizations.find(
      (r) => r.interactionRef === interaction.id
    )
    if (!ir || ir.mechanism !== 'DirectMarking') continue
    const workspace = qd.interactionStimulusAssociations.find(
      (a) => a.interactionRef === interaction.id && a.role === 'Workspace'
    )
    const integrated =
      Boolean(workspace) &&
      isIntegratedWorkspace(
        qd,
        qfd,
        interaction.id,
        workspace!.stimulusRef,
        blocks
      )
    findings.push(
      integrated
        ? pass(
            'CONF-MRK-001',
            `DirectMarking for '${interaction.code}' is integrated with its required Workspace stimulus.`,
            {
              affectedIds: [interaction.id],
            }
          )
        : fail(
            'CONF-MRK-001',
            `DirectMarking for '${interaction.code}' is not integrated with its required Workspace stimulus.`,
            {
              affectedIds: [interaction.id],
            }
          )
    )
  }

  return findings
}

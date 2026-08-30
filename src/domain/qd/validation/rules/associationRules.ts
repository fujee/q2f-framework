import type { QuestionDefinition, SourceAnchor, Stimulus } from '../../model'
import { supportsSourceAnchor } from '../../implementation/contentCarrier'
import type { QdIndex } from '../context'
import { type Finding, fail, pass } from '../types'

export function validateAssociations(
  qd: QuestionDefinition,
  index: QdIndex
): Finding[] {
  const findings: Finding[] = []
  const pairs = qd.associations.map(
    (a) => `${a.interactionRef}::${a.stimulusRef}`
  )
  findings.push(
    new Set(pairs).size === pairs.length
      ? pass('ASC-001', 'Interaction/stimulus association pairs are unique.')
      : fail(
          'ASC-001',
          'Each interaction/stimulus pair may have exactly one role.',
          {
            path: 'associations',
          }
        )
  )

  const referencedStimuli = new Set(qd.associations.map((a) => a.stimulusRef))
  const orphans = qd.stimuli.filter((s) => !referencedStimuli.has(s.id))
  findings.push(
    orphans.length === 0
      ? pass('ASC-002', 'Every Stimulus participates in an association.')
      : fail(
          'ASC-002',
          'Every Stimulus must participate in at least one association.',
          {
            path: 'stimuli',
            affectedIds: orphans.map(({ id }) => id),
          }
        )
  )

  qd.associations.forEach((association, i) => {
    if (association.role !== 'Workspace') return
    const interaction = index.interactionsById.get(association.interactionRef)
    if (
      interaction &&
      !['Selecting', 'Completing', 'Marking'].includes(interaction.type)
    )
      findings.push(
        fail('ASC-003', `Workspace is not defined for ${interaction.type}.`, {
          path: `associations[${i}]`,
        })
      )
  })

  qd.responseInteractions.forEach((interaction, interactionIndex) => {
    const workspaces = index.workspaceAssociationsFor(interaction.id)
    if (interaction.type === 'Selecting') {
      for (const workspace of workspaces) {
        if (
          !interaction.choices.some(
            (c) => c.workspaceStimulusRef === workspace.stimulusRef
          )
        )
          findings.push(
            fail('ASC-004', 'Each Selecting Workspace must host a Choice.', {
              path: `responseInteractions[${interactionIndex}]`,
            })
          )
      }
      interaction.choices.forEach((choice, choiceIndex) => {
        if (!choice.workspaceStimulusRef) return
        validateWorkspaceElement(
          findings,
          index,
          interaction.id,
          choice.workspaceStimulusRef,
          choice.placementSpecification,
          choice.sourceAnchor,
          `responseInteractions[${interactionIndex}].choices[${choiceIndex}]`
        )
      })
    } else if (interaction.type === 'Completing') {
      if (workspaces.length === 0)
        findings.push(
          fail(
            'ASC-005',
            'Completing requires at least one Workspace association.',
            {
              path: `responseInteractions[${interactionIndex}]`,
            }
          )
        )
      for (const workspace of workspaces) {
        if (
          !interaction.completingGaps.some(
            (g) => g.workspaceStimulusRef === workspace.stimulusRef
          )
        )
          findings.push(
            fail('ASC-005', 'Each Completing Workspace must host a gap.', {
              path: `responseInteractions[${interactionIndex}]`,
            })
          )
      }
      interaction.completingGaps.forEach((gap, gapIndex) =>
        validateWorkspaceElement(
          findings,
          index,
          interaction.id,
          gap.workspaceStimulusRef,
          gap.placementSpecification,
          gap.sourceAnchor,
          `responseInteractions[${interactionIndex}].completingGaps[${gapIndex}]`
        )
      )
    }
  })
  if (!findings.some((f) => f.ruleId === 'ASC-003'))
    findings.push(
      pass('ASC-003', 'Workspace roles are interaction-compatible.')
    )
  if (!findings.some((f) => f.ruleId === 'ASC-004'))
    findings.push(pass('ASC-004', 'Selecting Workspace hosts are complete.'))
  if (!findings.some((f) => f.ruleId === 'ASC-005'))
    findings.push(pass('ASC-005', 'Completing Workspace hosts are complete.'))
  return findings
}

function validateWorkspaceElement(
  findings: Finding[],
  index: QdIndex,
  interactionId: string,
  stimulusId: string,
  placementSpecification: string | undefined,
  sourceAnchor: SourceAnchor | undefined,
  path: string
): void {
  if (!index.workspaceStimulusFor(interactionId, stimulusId)) {
    findings.push(
      fail(
        'ASC-006',
        'Workspace host reference requires a matching Workspace association.',
        { path }
      )
    )
    return
  }
  const stimulus = index.stimuliById.get(stimulusId)
  if (!stimulus) return
  const placementValid = workspacePlacementValid(
    stimulus,
    placementSpecification,
    sourceAnchor
  )
  findings.push(
    placementValid
      ? pass('ASC-006', 'Workspace placement satisfies materialization rules.')
      : fail(
          'ASC-006',
          'Workspace placement is incompatible with its Stimulus materialization policy.',
          { path }
        )
  )
}

function workspacePlacementValid(
  stimulus: Stimulus,
  placementSpecification?: string,
  sourceAnchor?: SourceAnchor
): boolean {
  const hasPlacement = Boolean(placementSpecification?.trim())
  if (
    sourceAnchor &&
    !supportsSourceAnchor(stimulus.sourceContent, sourceAnchor.kind)
  )
    return false
  if (stimulus.materializationPolicy === 'Fixed')
    return Boolean(sourceAnchor) || hasPlacement
  return hasPlacement
}

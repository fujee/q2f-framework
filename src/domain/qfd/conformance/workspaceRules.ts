import type { Choice, QuestionDefinition, SourceAnchor } from '../../qd/model'
import { fail, pass, reviewRequired, type Finding } from '../../shared/findings'
import type {
  QuestionFormDefinition,
  RealizationAnchor,
  StimulusRealization,
} from '../model'
import { workspaceBindingKey, type ConformanceEvidence } from './evidence'

export function validateWorkspaceConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  evidence: ConformanceEvidence
): Finding[] {
  const findings: Finding[] = []
  for (const interaction of qd.responseInteractions) {
    const realization = qfd.interactionRealizations.find(
      ({ interactionRef }) => interactionRef === interaction.id
    )
    if (!realization) continue
    if (
      interaction.type === 'Selecting' &&
      realization.type === 'SelectingRealization'
    ) {
      for (const choice of interaction.choices.filter(
        ({ workspaceStimulusRef }) => workspaceStimulusRef !== undefined
      )) {
        findings.push(
          selectingBindingFinding(
            interaction.id,
            choice,
            realization,
            qfd,
            evidence
          )
        )
      }
      for (const workspace of realization.workspaceRealizations) {
        if (workspace.mode !== 'ReferencedSelection') continue
        findings.push(
          evidence.trustedReferencedSelectionInteractionRefs?.has(
            interaction.id
          )
            ? pass(
                'CONF-WRK-SEL-REF-001',
                `ReferencedSelection for '${interaction.id}' has trusted correspondence evidence.`
              )
            : reviewRequired(
                'CONF-WRK-SEL-REF-001',
                `ReferencedSelection for '${interaction.id}' requires correspondence review.`
              )
        )
      }
    }
    if (
      interaction.type === 'Completing' &&
      realization.type === 'CompletingRealization'
    ) {
      for (const gap of interaction.completingGaps) {
        const gapRealization = realization.gapRealizations.find(
          ({ gapRef }) => gapRef === gap.id
        )
        if (!gapRealization) {
          findings.push(
            fail(
              'CONF-WRK-LOC-001',
              `Gap '${gap.id}' lacks a concrete Workspace binding.`
            )
          )
          continue
        }
        const sr = qfd.stimulusRealizations.find(
          ({ id }) => id === gapRealization.stimulusRealizationRef
        )
        if (
          !sr ||
          sr.stimulusRef !== gap.workspaceStimulusRef ||
          !sr.servedInteractionRefs.includes(interaction.id)
        ) {
          findings.push(
            fail(
              'CONF-WRK-LOC-001',
              `Gap '${gap.id}' is bound to the wrong concrete Workspace SR.`
            )
          )
          continue
        }
        findings.push(
          locationFinding(
            interaction.id,
            gap.id,
            gap,
            gapRealization.realizationAnchor,
            sr,
            evidence
          )
        )
        if (gapRealization.responsePlacement === 'Referenced') {
          const key = workspaceBindingKey(interaction.id, gap.id)
          findings.push(
            evidence.trustedReferencedGapKeys?.has(key)
              ? pass(
                  'CONF-CMP-REF-001',
                  `Referenced gap '${gap.id}' has trusted correspondence evidence.`
                )
              : reviewRequired(
                  'CONF-CMP-REF-001',
                  `Referenced gap '${gap.id}' requires correspondence review.`
                )
          )
        }
      }
    }
    if (
      interaction.type === 'Marking' &&
      realization.type === 'MarkingRealization'
    ) {
      const association = qd.associations.find(
        ({ interactionRef, role }) =>
          interactionRef === interaction.id && role === 'Workspace'
      )
      const sr = qfd.stimulusRealizations.find(
        ({ id }) => id === realization.workspaceRealizationRef
      )
      const exactBinding = Boolean(
        association &&
        sr &&
        sr.stimulusRef === association.stimulusRef &&
        sr.servedInteractionRefs.includes(interaction.id)
      )
      const modalityValid = Boolean(
        sr &&
        (interaction.markType === 'TextSpan'
          ? sr.realizedModality === 'Text'
          : sr.realizedModality === 'Image')
      )
      findings.push(
        exactBinding && modalityValid
          ? pass(
              'CONF-MRK-001',
              `Marking '${interaction.id}' preserves its exact response surface and modality.`
            )
          : fail(
              'CONF-MRK-001',
              `Marking '${interaction.id}' violates response-surface binding or modality.`
            )
      )
    }
  }
  return findings
}

function selectingBindingFinding(
  interactionId: string,
  choice: Choice,
  realization: Extract<
    QuestionFormDefinition['interactionRealizations'][number],
    { type: 'SelectingRealization' }
  >,
  qfd: QuestionFormDefinition,
  evidence: ConformanceEvidence
): Finding {
  for (const workspace of realization.workspaceRealizations) {
    const choiceRealization = workspace.choiceRealizations.find(
      ({ choiceRef }) => choiceRef === choice.id
    )
    if (!choiceRealization) continue
    const sr = qfd.stimulusRealizations.find(
      ({ id }) => id === workspace.stimulusRealizationRef
    )
    if (
      !sr ||
      sr.stimulusRef !== choice.workspaceStimulusRef ||
      !sr.servedInteractionRefs.includes(interactionId)
    )
      return fail(
        'CONF-WRK-SEL-001',
        `Choice '${choice.id}' is bound to the wrong concrete Workspace SR.`
      )
    return locationFinding(
      interactionId,
      choice.id,
      choice,
      choiceRealization.realizationAnchor,
      sr,
      evidence
    )
  }
  return fail(
    'CONF-WRK-SEL-001',
    `Choice '${choice.id}' lacks a concrete Workspace binding.`
  )
}

function locationFinding(
  interactionId: string,
  elementId: string,
  qdPlacement: {
    sourceAnchor?: SourceAnchor
    placementSpecification?: string
  },
  realizationAnchor: RealizationAnchor | undefined,
  sr: StimulusRealization | undefined,
  evidence: ConformanceEvidence
): Finding {
  const key = workspaceBindingKey(interactionId, elementId)
  const directSourceReuse = Boolean(
    qdPlacement.sourceAnchor &&
    sr?.mode === 'PreserveContent' &&
    realizationAnchor === undefined
  )
  if (directSourceReuse || evidence.trustedWorkspaceBindingKeys?.has(key))
    return pass(
      'CONF-WRK-LOC-001',
      `Workspace location for '${elementId}' is deterministically preserved.`
    )
  if (!sr || !realizationAnchor)
    return fail(
      'CONF-WRK-LOC-001',
      `Workspace location for '${elementId}' is not concretely preserved.`
    )
  return reviewRequired(
    'CONF-WRK-LOC-001',
    `Opaque Workspace location mapping for '${elementId}' requires review.`
  )
}

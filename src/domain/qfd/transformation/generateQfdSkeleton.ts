import type { Id, QuestionDefinition } from '../../qd/model'
import type {
  ContainerElement,
  InteractionRealization,
  LayoutElement,
  ProfileId,
  QuestionFormProfile,
  StimulusRealization,
} from '../model'
import { MECHANISM_DESCRIPTORS } from '../mechanisms/registry'
import { PROFILE_REGISTRY } from '../profiles/registry'

/**
 * QD -> QFD skeleton generation (QFD plan Section 18): deterministic assistance
 * only. Never invents a mechanism choice when more than one is valid, never
 * designs layout/spatial placement, never fabricates adapted/materialized
 * content, and never reformulates instructions. Ambiguous or unresolvable
 * decisions are reported as obligations instead of guessed — the resulting
 * skeleton is a draft, not guaranteed to pass `validateQFD`/conformance until a
 * human resolves every obligation.
 */

export type ObligationKind =
  | 'NoCompatibleMechanism'
  | 'MechanismChoice'
  | 'StimulusRealizationDecision'
  | 'StimulusContentRequired'
  | 'WorkspaceIntegration'
  | 'OrderDependency'

export interface TransformationObligation {
  kind: ObligationKind
  message: string
  interactionRef?: Id
  stimulusRef?: Id
  /** Candidate options a human must choose between, when applicable. */
  options?: string[]
}

export interface QfdSkeleton {
  questionDefinitionRef: Id
  targetProfileRef: ProfileId
  interactionRealizations: InteractionRealization[]
  stimulusRealizations: StimulusRealization[]
  rootLayout: ContainerElement
  obligations: TransformationObligation[]
}

export function generateQfdSkeleton(
  qd: QuestionDefinition,
  targetProfileRef: ProfileId
): QfdSkeleton {
  const profile = PROFILE_REGISTRY[targetProfileRef]
  const obligations: TransformationObligation[] = []
  const interactionRealizations: InteractionRealization[] = []
  const stimulusRealizations: StimulusRealization[] = []
  const stackChildren: LayoutElement[] = []

  const requiredStimulusIds = new Set(
    qd.interactionStimulusAssociations.map((a) => a.stimulusRef)
  )
  for (const stimulus of qd.stimuli) {
    if (!requiredStimulusIds.has(stimulus.id)) continue

    if (stimulus.materializationPolicy === 'Fixed') {
      const sr: StimulusRealization = {
        id: `sr-${stimulus.id}`,
        stimulusRef: stimulus.id,
        mode: 'ReuseSource',
      }
      stimulusRealizations.push(sr)
      stackChildren.push({
        kind: 'StimulusBlock',
        stimulusRealizationRef: sr.id,
      })
    } else if (stimulus.materializationPolicy === 'SpecificationBased') {
      const sr: StimulusRealization = {
        id: `sr-${stimulus.id}`,
        stimulusRef: stimulus.id,
        mode: 'MaterializeFromSpecification',
      }
      stimulusRealizations.push(sr)
      stackChildren.push({
        kind: 'StimulusBlock',
        stimulusRealizationRef: sr.id,
      })
      obligations.push({
        kind: 'StimulusContentRequired',
        stimulusRef: stimulus.id,
        message: `Stimulus '${stimulus.code}' must be materialized from its contentSpecification before this form is valid; provide realizedContent.`,
      })
    } else {
      // Adaptable: ReuseSource vs AdaptSource is an authoring decision, not something to guess.
      obligations.push({
        kind: 'StimulusRealizationDecision',
        stimulusRef: stimulus.id,
        message: `Stimulus '${stimulus.code}' is Adaptable; choose ReuseSource or AdaptSource.`,
        options: ['ReuseSource', 'AdaptSource'],
      })
    }
  }

  for (const interaction of qd.responseInteractions) {
    const compatibleMechanisms = [
      ...profile.supportedResponseMechanisms,
    ].filter((m) =>
      MECHANISM_DESCRIPTORS[m].compatibleInteractionTypes.has(interaction.type)
    )
    const hasWorkspace = qd.interactionStimulusAssociations.some(
      (a) => a.interactionRef === interaction.id && a.role === 'Workspace'
    )

    if (compatibleMechanisms.length === 0) {
      obligations.push({
        kind: 'NoCompatibleMechanism',
        interactionRef: interaction.id,
        message: `No mechanism supported by profile '${profile.id}' is compatible with interaction '${interaction.code}'.`,
      })
      continue
    }

    if (compatibleMechanisms.length > 1) {
      obligations.push({
        kind: 'MechanismChoice',
        interactionRef: interaction.id,
        message: `Interaction '${interaction.code}' has ${compatibleMechanisms.length} valid mechanisms under profile '${profile.id}'; a human must choose.`,
        options: compatibleMechanisms,
      })
      if (hasWorkspace) {
        obligations.push({
          kind: 'WorkspaceIntegration',
          interactionRef: interaction.id,
          message: `Interaction '${interaction.code}' requires Workspace integration; layout/spatial mapping must be authored once a mechanism is chosen.`,
        })
      }
      continue
    }

    const ir: InteractionRealization = {
      id: `ir-${interaction.id}`,
      interactionRef: interaction.id,
      mechanism: compatibleMechanisms[0],
    }
    interactionRealizations.push(ir)
    stackChildren.push({
      kind: 'InteractionBlock',
      interactionRealizationRef: ir.id,
    })

    if (hasWorkspace) {
      obligations.push({
        kind: 'WorkspaceIntegration',
        interactionRef: interaction.id,
        message: `Interaction '${interaction.code}' requires integrated Workspace realization with its associated stimulus; this cannot be auto-generated.`,
      })
    }
  }

  for (const constraint of qd.constraints) {
    if (constraint.strength !== 'Required') continue
    if (constraint.type === 'Sequence') {
      obligations.push({
        kind: 'OrderDependency',
        message: `Preserve required order ${constraint.interactionRefs.join(' -> ')} in the final layout's logical presentation order.`,
      })
    } else {
      obligations.push({
        kind: 'OrderDependency',
        interactionRef: constraint.successorInteractionRef,
        message: `Preserve required order: '${constraint.predecessorInteractionRef}' before '${constraint.successorInteractionRef}' (${constraint.rule}).`,
      })
    }
  }

  return {
    questionDefinitionRef: qd.id,
    targetProfileRef,
    interactionRealizations,
    stimulusRealizations,
    rootLayout: {
      kind: 'Stack',
      direction: 'Vertical',
      children: stackChildren,
    },
    obligations,
  }
}

/** Planning-only helper (QFD plan Section 5 / handoff "canonical evaluation pipeline"
 * note): answers "could this profile potentially realize this QD at all?" by
 * searching for compatible mechanisms/modalities. Distinct from — and must not be
 * confused with — `evaluateProfileFeasibility`, which evaluates a concrete QFD. */
export interface PotentialRealizationCheck {
  potentiallyRealizable: boolean
  unsupportedInteractionIds: Id[]
  unsupportedStimulusIds: Id[]
}

export function checkPotentialRealization(
  qd: QuestionDefinition,
  profile: QuestionFormProfile
): PotentialRealizationCheck {
  const unsupportedInteractionIds = qd.responseInteractions
    .filter(
      (interaction) =>
        ![...profile.supportedResponseMechanisms].some((m) =>
          MECHANISM_DESCRIPTORS[m].compatibleInteractionTypes.has(
            interaction.type
          )
        )
    )
    .map((i) => i.id)

  const requiredStimulusIds = new Set(
    qd.interactionStimulusAssociations.map((a) => a.stimulusRef)
  )
  const unsupportedStimulusIds = qd.stimuli
    .filter(
      (s) =>
        requiredStimulusIds.has(s.id) &&
        !profile.supportedStimulusTypes.has(s.type)
    )
    .map((s) => s.id)

  return {
    potentiallyRealizable:
      unsupportedInteractionIds.length === 0 &&
      unsupportedStimulusIds.length === 0,
    unsupportedInteractionIds,
    unsupportedStimulusIds,
  }
}

import type {
  Completing,
  DependencyConstraint,
  QuestionDefinition,
  ResponseInteraction,
  Stimulus,
  StimulusModality,
} from '../../qd/model'
import type {
  DependencyRealization,
  InteractionPrecedence,
  StimulusRealizationMode,
} from '../model'
import type { QFDCapability, QuestionFormProfile } from '../profiles/model'

/**
 * Implementation-level authoring plan. It deliberately is not assignable to
 * QuestionFormDefinition: a final QFD requires complete concrete realization,
 * presentation, anchor, content, and layout decisions that this helper must not
 * invent.
 */

export type TransformationObligationKind =
  | 'StimulusRealizationDecision'
  | 'RealizedContentRequired'
  | 'InteractionRealizationDecision'
  | 'PresentationDecision'
  | 'WorkspaceRealizationDecision'
  | 'RealizationAnchorRequired'
  | 'LayoutRequired'
  | 'DependencyRealizationDecision'
  | 'NoFeasibleRealizationCandidate'

export interface TransformationObligation {
  kind: TransformationObligationKind
  message: string
  interactionRef?: string
  stimulusRef?: string
  elementRef?: string
  options?: string[]
  missingCapabilities?: QFDCapability[]
}

export interface StimulusRealizationPlan {
  stimulusRef: string
  servedInteractionRefs: string[]
  modeCandidates: StimulusRealizationMode[]
  selectedMode?: StimulusRealizationMode
  modalityCandidates: StimulusModality[]
  selectedModality?: StimulusModality
  /** True only when every final realization candidate needs authored content. */
  realizedContentRequired: boolean
}

export interface InteractionRealizationOption {
  id: string
  requiredCapabilities: QFDCapability[]
}

export interface InteractionRealizationPlan {
  interactionRef: string
  interactionType: ResponseInteraction['type']
  candidateOptions: InteractionRealizationOption[]
  unavailableOptions: Array<
    InteractionRealizationOption & { missingCapabilities: QFDCapability[] }
  >
  selectedOptionId?: string
  instructionPlan:
    { taskInstruction: 'Absent' } | { taskInstruction: 'ReuseQdInstruction' }
}

export interface DependencyRealizationPlan {
  realization: DependencyRealization
  inclusion: 'Required' | 'Optional'
  missingCapabilities: QFDCapability[]
}

export interface QfdSkeleton {
  kind: 'QfdSkeleton'
  questionDefinitionRef: string
  targetProfileRef: string
  stimulusPlans: StimulusRealizationPlan[]
  interactionPlans: InteractionRealizationPlan[]
  interactionPrecedenceRequirements: InteractionPrecedence[]
  dependencyPlans: DependencyRealizationPlan[]
  obligations: TransformationObligation[]
}

interface CandidateOption {
  id: string
  requiredCapabilities: QFDCapability[]
}

export function generateQfdSkeleton(
  qd: QuestionDefinition,
  targetProfile: QuestionFormProfile
): QfdSkeleton {
  const obligations: TransformationObligation[] = []
  const supportedCapabilities = new Set(targetProfile.capabilities)
  const stimulusPlans = qd.stimuli
    .filter((stimulus) =>
      qd.associations.some(({ stimulusRef }) => stimulusRef === stimulus.id)
    )
    .map((stimulus) => planStimulus(qd, stimulus, targetProfile, obligations))

  const interactionPlans = qd.responseInteractions.map((interaction) =>
    planInteraction(qd, interaction, supportedCapabilities, obligations)
  )

  const interactionPrecedenceRequirements = sequenceRequirements(qd)
  const dependencyPlans = qd.constraints
    .filter(
      (constraint): constraint is DependencyConstraint =>
        constraint.type === 'Dependency'
    )
    .map((dependency) =>
      planDependency(dependency, supportedCapabilities, obligations)
    )

  const layoutOptions = ['SinglePlacementWhenStructurallyApplicable']
  if (supportedCapabilities.has('HorizontalComposition'))
    layoutOptions.push('HorizontalLayoutGroup')
  if (supportedCapabilities.has('VerticalComposition'))
    layoutOptions.push('VerticalLayoutGroup')
  obligations.push({
    kind: 'LayoutRequired',
    message:
      'Author a complete baseline root layout and all required local presentation layouts; the transformation does not impose spatial organization.',
    options: layoutOptions,
  })

  return {
    kind: 'QfdSkeleton',
    questionDefinitionRef: qd.id,
    targetProfileRef: targetProfile.id,
    stimulusPlans,
    interactionPlans,
    interactionPrecedenceRequirements,
    dependencyPlans,
    obligations,
  }
}

function planStimulus(
  qd: QuestionDefinition,
  stimulus: Stimulus,
  targetProfile: QuestionFormProfile,
  obligations: TransformationObligation[]
): StimulusRealizationPlan {
  const servedInteractionRefs = [
    ...new Set(
      qd.associations
        .filter(({ stimulusRef }) => stimulusRef === stimulus.id)
        .map(({ interactionRef }) => interactionRef)
    ),
  ]
  const modalityCandidates = stimulus.allowedModalities.filter((modality) =>
    targetProfile.supportedStimulusModalities.includes(modality)
  )
  let modeCandidates: StimulusRealizationMode[]
  let selectedMode: StimulusRealizationMode | undefined
  let realizedContentRequired = false

  if (stimulus.materializationPolicy === 'Fixed') {
    modeCandidates = ['PreserveContent']
    selectedMode = 'PreserveContent'
    obligations.push({
      kind: 'StimulusRealizationDecision',
      stimulusRef: stimulus.id,
      message:
        `Fixed Stimulus '${stimulus.id}' requires evidence that its source carrier is directly usable ` +
        'in the selected modality, or explicit concrete realizedContent.',
      options: ['UseSourceCarrierIfDirectlyUsable', 'ProvideRealizedContent'],
    })
  } else if (stimulus.materializationPolicy === 'Adaptable') {
    modeCandidates = ['PreserveContent', 'AdaptContent']
    obligations.push({
      kind: 'StimulusRealizationDecision',
      stimulusRef: stimulus.id,
      message: `Adaptable Stimulus '${stimulus.id}' permits PreserveContent or AdaptContent; authoring must choose without changing QD semantics.`,
      options: modeCandidates,
    })
    obligations.push({
      kind: 'RealizedContentRequired',
      stimulusRef: stimulus.id,
      message: `If AdaptContent is selected for '${stimulus.id}', provide concrete semantic-preserving realizedContent.`,
      options: ['RequiredForAdaptContent'],
    })
  } else {
    modeCandidates = ['MaterializeFromSpecification']
    selectedMode = 'MaterializeFromSpecification'
    realizedContentRequired = true
    obligations.push({
      kind: 'RealizedContentRequired',
      stimulusRef: stimulus.id,
      message: `SpecificationBased Stimulus '${stimulus.id}' requires authored concrete realizedContent; the skeleton does not materialize it.`,
    })
  }

  if (modalityCandidates.length === 0) {
    obligations.push({
      kind: 'NoFeasibleRealizationCandidate',
      stimulusRef: stimulus.id,
      message: `Target profile '${targetProfile.id}' supports none of the allowed modalities for Stimulus '${stimulus.id}'.`,
    })
  } else if (modalityCandidates.length > 1) {
    obligations.push({
      kind: 'StimulusRealizationDecision',
      stimulusRef: stimulus.id,
      message: `Choose a concrete realized modality for Stimulus '${stimulus.id}'.`,
      options: modalityCandidates,
    })
  }

  return {
    stimulusRef: stimulus.id,
    servedInteractionRefs,
    modeCandidates,
    ...(selectedMode ? { selectedMode } : {}),
    modalityCandidates,
    ...(modalityCandidates.length === 1
      ? { selectedModality: modalityCandidates[0] }
      : {}),
    realizedContentRequired,
  }
}

function planInteraction(
  qd: QuestionDefinition,
  interaction: ResponseInteraction,
  supportedCapabilities: ReadonlySet<QFDCapability>,
  obligations: TransformationObligation[]
): InteractionRealizationPlan {
  const allOptions = interactionOptions(interaction).map((candidate) => ({
    ...candidate,
    requiredCapabilities: uniqueCapabilities([
      ...candidate.requiredCapabilities,
      ...(interaction.instruction ? ['TextualPresentation' as const] : []),
    ]),
  }))
  const candidateOptions = allOptions.filter(({ requiredCapabilities }) =>
    requiredCapabilities.every((capability) =>
      supportedCapabilities.has(capability)
    )
  )
  const unavailableOptions = allOptions
    .filter((candidate) => !candidateOptions.includes(candidate))
    .map((candidate) => ({
      ...candidate,
      missingCapabilities: candidate.requiredCapabilities.filter(
        (capability) => !supportedCapabilities.has(capability)
      ),
    }))

  if (candidateOptions.length === 0) {
    obligations.push({
      kind: 'NoFeasibleRealizationCandidate',
      interactionRef: interaction.id,
      message: `No interaction-specific realization option for '${interaction.id}' is supported by the target profile.`,
      options: allOptions.map(({ id }) => id),
      missingCapabilities: uniqueCapabilities(
        unavailableOptions.flatMap(
          ({ missingCapabilities }) => missingCapabilities
        )
      ),
    })
  } else if (candidateOptions.length > 1) {
    obligations.push({
      kind: 'InteractionRealizationDecision',
      interactionRef: interaction.id,
      message:
        `Multiple semantically permitted QFD realization options remain for '${interaction.id}'; ` +
        'the skeleton does not choose one.',
      options: candidateOptions.map(({ id }) => id),
    })
  }

  if (
    ['Selecting', 'Ordering', 'Relating', 'Completing'].includes(
      interaction.type
    )
  ) {
    obligations.push({
      kind: 'PresentationDecision',
      interactionRef: interaction.id,
      message: `Author complete typed presentations and local layouts for '${interaction.id}' after selecting its realization option.`,
    })
  }

  planWorkspaceDecisions(qd, interaction, obligations)

  return {
    interactionRef: interaction.id,
    interactionType: interaction.type,
    candidateOptions,
    unavailableOptions,
    ...(candidateOptions.length === 1
      ? { selectedOptionId: candidateOptions[0].id }
      : {}),
    instructionPlan: interaction.instruction
      ? { taskInstruction: 'ReuseQdInstruction' }
      : { taskInstruction: 'Absent' },
  }
}

function interactionOptions(
  interaction: ResponseInteraction
): CandidateOption[] {
  switch (interaction.type) {
    case 'Selecting':
      return selectingOptions(interaction)
    case 'Ordering':
      return [
        option('OrderingRealization:DirectOrdering', [
          'DirectOrdering',
          'TextualPresentation',
        ]),
        option('OrderingRealization:OrderNotation', [
          'OrderNotation',
          'TextualPresentation',
        ]),
      ]
    case 'Relating':
      return [
        option('RelatingRealization:DirectRelationConstruction', [
          'DirectRelationConstruction',
          'TextualPresentation',
        ]),
        option('RelatingRealization:RelationNotation', [
          'RelationNotation',
          'TextualPresentation',
        ]),
      ]
    case 'Completing':
      return completingOptions(interaction)
    case 'ShortInput':
      return [option('ShortInputRealization', ['ScalarResponse'])]
    case 'Essay':
      return [option('EssayRealization', ['ExtendedTextResponse'])]
    case 'ArtifactSubmission':
      return [
        option('ArtifactSubmissionRealization:DigitalSubmission', [
          'DigitalArtifactSubmission',
        ]),
        option('ArtifactSubmissionRealization:PhysicalSubmission', [
          'PhysicalArtifactSubmission',
        ]),
      ]
    case 'Marking':
      return [
        option('MarkingRealization', [
          interaction.markType === 'Point'
            ? 'PointMarking'
            : interaction.markType === 'Region'
              ? 'RegionMarking'
              : 'TextSpanMarking',
        ]),
      ]
  }
}

function selectingOptions(
  interaction: Extract<ResponseInteraction, { type: 'Selecting' }>
): CandidateOption[] {
  let variants: CandidateOption[] = [option('SelectingRealization', [])]
  const standaloneCount = interaction.choices.filter(
    ({ workspaceStimulusRef }) => workspaceStimulusRef === undefined
  ).length
  if (standaloneCount > 0) {
    variants = expandOptions(variants, [
      option('Expanded', ['ExpandedSelection', 'TextualPresentation']),
      option('Collapsed', ['CollapsedSelection', 'TextualPresentation']),
    ])
  }

  const workspaceRefs = [
    ...new Set(
      interaction.choices.flatMap(({ workspaceStimulusRef }) =>
        workspaceStimulusRef ? [workspaceStimulusRef] : []
      )
    ),
  ]
  for (const workspaceRef of workspaceRefs) {
    variants = expandOptions(variants, [
      option(`${workspaceRef}=DirectSelection`, ['DirectWorkspaceSelection']),
      option(`${workspaceRef}=ReferencedSelection`, [
        'ReferencedWorkspaceSelection',
      ]),
    ])
  }
  return variants
}

function completingOptions(interaction: Completing): CandidateOption[] {
  let variants: CandidateOption[] = [option('CompletingRealization', [])]
  for (const gap of interaction.completingGaps) {
    const gapOptions =
      gap.type === 'InputGap'
        ? [
            option(`${gap.id}=InputGap:Embedded`, [
              'ScalarResponse',
              'EmbeddedGapResponse',
            ]),
            option(`${gap.id}=InputGap:Referenced`, [
              'ScalarResponse',
              'ReferencedGapResponse',
            ]),
          ]
        : itemGapOptions(gap.id)
    variants = expandOptions(variants, gapOptions)
  }
  return variants
}

function itemGapOptions(gapRef: string): CandidateOption[] {
  const candidates: CandidateOption[] = []
  for (const placement of ['Embedded', 'Referenced'] as const) {
    const placementCapability: QFDCapability =
      placement === 'Embedded' ? 'EmbeddedGapResponse' : 'ReferencedGapResponse'
    candidates.push(
      option(`${gapRef}=ItemGap:DirectPlacement:${placement}`, [
        'DirectItemPlacement',
        'TextualPresentation',
        placementCapability,
      ]),
      option(`${gapRef}=ItemGap:ItemSelection:Expanded:${placement}`, [
        'ExpandedSelection',
        'TextualPresentation',
        placementCapability,
      ]),
      option(`${gapRef}=ItemGap:ItemSelection:Collapsed:${placement}`, [
        'CollapsedSelection',
        'TextualPresentation',
        placementCapability,
      ])
    )
  }
  return candidates
}

function expandOptions(
  bases: readonly CandidateOption[],
  additions: readonly CandidateOption[]
): CandidateOption[] {
  return bases.flatMap((base) =>
    additions.map((addition) =>
      option(`${base.id}+${addition.id}`, [
        ...base.requiredCapabilities,
        ...addition.requiredCapabilities,
      ])
    )
  )
}

function option(
  id: string,
  requiredCapabilities: QFDCapability[]
): CandidateOption {
  return { id, requiredCapabilities: uniqueCapabilities(requiredCapabilities) }
}

function uniqueCapabilities(
  capabilities: readonly QFDCapability[]
): QFDCapability[] {
  return [...new Set(capabilities)]
}

function planWorkspaceDecisions(
  qd: QuestionDefinition,
  interaction: ResponseInteraction,
  obligations: TransformationObligation[]
): void {
  const workspaceStimulusRefs = qd.associations
    .filter(
      ({ interactionRef, role }) =>
        interactionRef === interaction.id && role === 'Workspace'
    )
    .map(({ stimulusRef }) => stimulusRef)
  if (workspaceStimulusRefs.length === 0) return

  obligations.push({
    kind: 'WorkspaceRealizationDecision',
    interactionRef: interaction.id,
    message:
      `Bind '${interaction.id}' to concrete Workspace StimulusRealization instances; ` +
      'cross-modal realizations do not automatically inherit source locations.',
    options: workspaceStimulusRefs,
  })

  const placedElements =
    interaction.type === 'Selecting'
      ? interaction.choices
          .filter(
            ({ workspaceStimulusRef }) => workspaceStimulusRef !== undefined
          )
          .map((choice) => ({
            id: choice.id,
            hasSourceAnchor: choice.sourceAnchor !== undefined,
          }))
      : interaction.type === 'Completing'
        ? interaction.completingGaps.map((gap) => ({
            id: gap.id,
            hasSourceAnchor: gap.sourceAnchor !== undefined,
          }))
        : []

  for (const element of placedElements) {
    obligations.push({
      kind: 'RealizationAnchorRequired',
      interactionRef: interaction.id,
      elementRef: element.id,
      message:
        `Resolve the concrete location for '${element.id}' against the selected Workspace realization; ` +
        'no locator payload is generated.',
      options: element.hasSourceAnchor
        ? [
            'UseExistingSourceAnchorOnlyIfDirectlyApplicable',
            'ProvideConcreteRealizationAnchor',
          ]
        : ['ProvideConcreteRealizationAnchor'],
    })
  }
}

function sequenceRequirements(qd: QuestionDefinition): InteractionPrecedence[] {
  const keys = new Set<string>()
  const requirements: InteractionPrecedence[] = []
  for (const sequence of qd.constraints.filter(
    (constraint) => constraint.type === 'Sequence'
  )) {
    for (let index = 0; index < sequence.interactionRefs.length - 1; index++) {
      const beforeInteractionRef = sequence.interactionRefs[index]
      const afterInteractionRef = sequence.interactionRefs[index + 1]
      const key = `${JSON.stringify(beforeInteractionRef)}:${JSON.stringify(afterInteractionRef)}`
      if (keys.has(key)) continue
      keys.add(key)
      requirements.push({ beforeInteractionRef, afterInteractionRef })
    }
  }
  return requirements
}

function planDependency(
  dependency: DependencyConstraint,
  supportedCapabilities: ReadonlySet<QFDCapability>,
  obligations: TransformationObligation[]
): DependencyRealizationPlan {
  const requiredCapabilities = dependencyCapabilities(dependency)
  const missingCapabilities = requiredCapabilities.filter(
    (capability) => !supportedCapabilities.has(capability)
  )
  const realization: DependencyRealization = {
    predecessorInteractionRef: dependency.predecessorInteractionRef,
    successorInteractionRef: dependency.successorInteractionRef,
    rule: dependency.rule,
    exposurePolicy: dependency.exposurePolicy,
  }

  if (dependency.strength === 'Preferred') {
    obligations.push({
      kind: 'DependencyRealizationDecision',
      interactionRef: dependency.successorInteractionRef,
      message:
        'Preferred dependency realization is optional; omission and complete rule-plus-exposure realization remain explicit authoring alternatives.',
      options: ['OmitWithConformanceWarning', 'RealizeCompleteDependency'],
      ...(missingCapabilities.length > 0 ? { missingCapabilities } : {}),
    })
  } else if (missingCapabilities.length > 0) {
    obligations.push({
      kind: 'NoFeasibleRealizationCandidate',
      interactionRef: dependency.successorInteractionRef,
      message:
        'Required dependency semantics remain in the plan, but the target profile lacks capabilities needed to execute them.',
      missingCapabilities,
    })
  }

  return {
    realization,
    inclusion: dependency.strength === 'Required' ? 'Required' : 'Optional',
    missingCapabilities,
  }
}

function dependencyCapabilities(
  dependency: DependencyConstraint
): QFDCapability[] {
  return uniqueCapabilities([
    dependency.rule === 'RequiresCompletion'
      ? 'CompletionGating'
      : 'CorrectnessGating',
    ...(dependency.exposurePolicy === 'ConcealedUntilSatisfied'
      ? (['ConditionalConcealment'] as const)
      : []),
  ])
}

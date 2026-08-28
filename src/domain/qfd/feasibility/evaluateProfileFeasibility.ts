import type { DependencyConstraint, QuestionDefinition } from '../../qd/model'
import {
  aggregateFeasibility,
  fail,
  pass,
  warning,
  type FeasibilityAggregate,
  type Finding,
} from '../../shared/findings'
import type {
  InteractionRealization,
  LayoutElement,
  QuestionFormDefinition,
  RealizationAnchor,
  SelectionPresentation,
} from '../model'
import type { QFDCapability, QuestionFormProfile } from '../profiles/model'

export interface FeasibilityResult {
  findings: Finding[]
  aggregate: FeasibilityAggregate
}

/** Capability support for mandatory QD requirements and concrete QFD decisions. */
export function evaluateProfileFeasibility(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  profile: QuestionFormProfile
): FeasibilityResult {
  const findings: Finding[] = []
  for (const realization of qfd.stimulusRealizations) {
    findings.push(
      profile.supportedStimulusModalities.includes(realization.realizedModality)
        ? pass(
            'FEAS-MOD-001',
            `Profile supports '${realization.realizedModality}' for '${realization.id}'.`,
            { affectedIds: [realization.id] }
          )
        : fail(
            'FEAS-MOD-001',
            `Profile does not support '${realization.realizedModality}' for '${realization.id}'.`,
            { affectedIds: [realization.id] }
          )
    )
  }

  const concreteCapabilities = deriveConcreteCapabilities(qd, qfd)
  const normalizedDependencies = normalizeQdDependencies(qd)
  const mandatoryCapabilities = new Set<QFDCapability>()
  for (const dependency of normalizedDependencies.values()) {
    if (dependency.strength !== 'Required') continue
    dependencyCapabilities(dependency).forEach((capability) =>
      mandatoryCapabilities.add(capability)
    )
  }
  const requiredCapabilities = new Set([
    ...concreteCapabilities,
    ...mandatoryCapabilities,
  ])
  for (const capability of [...requiredCapabilities].sort()) {
    findings.push(
      profile.capabilities.includes(capability)
        ? pass(
            'FEAS-CAP-001',
            `Profile supports required capability '${capability}'.`
          )
        : fail(
            'FEAS-CAP-001',
            `Profile lacks required capability '${capability}'.`
          )
    )
  }

  const realizedDependencyKeys = new Set(
    qfd.dependencyRealizations.map(dependencyKey)
  )
  const warnedCapabilities = new Set<QFDCapability>()
  for (const [key, dependency] of normalizedDependencies) {
    if (dependency.strength !== 'Preferred' || realizedDependencyKeys.has(key))
      continue
    for (const capability of dependencyCapabilities(dependency)) {
      if (
        requiredCapabilities.has(capability) ||
        profile.capabilities.includes(capability) ||
        warnedCapabilities.has(capability)
      )
        continue
      warnedCapabilities.add(capability)
      findings.push(
        warning(
          'FEAS-DEP-PREF-001',
          `Profile lacks '${capability}' for an omitted Preferred dependency.`
        )
      )
    }
  }

  return { findings, aggregate: aggregateFeasibility(findings) }
}

export function deriveConcreteCapabilities(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): Set<QFDCapability> {
  const capabilities = new Set<QFDCapability>()
  collectLayoutCapabilities(qfd.rootLayout, capabilities)
  for (const realization of qfd.interactionRealizations) {
    collectInteractionCapabilities(qd, realization, capabilities)
  }
  if (qfd.interactionPrecedences.length > 0)
    capabilities.add('LogicalInteractionPrecedence')
  for (const dependency of qfd.dependencyRealizations) {
    dependencyCapabilities(dependency).forEach((capability) =>
      capabilities.add(capability)
    )
  }
  return capabilities
}

function collectInteractionCapabilities(
  qd: QuestionDefinition,
  realization: InteractionRealization,
  capabilities: Set<QFDCapability>
): void {
  const qdInteraction = qd.responseInteractions.find(
    ({ id }) => id === realization.interactionRef
  )
  if (
    realization.instructionRealizations.some(
      (instruction) =>
        Boolean(instruction.realizedText?.trim()) ||
        (instruction.role === 'TaskInstruction' &&
          Boolean(qdInteraction?.instruction?.trim()))
    )
  )
    capabilities.add('TextualPresentation')

  switch (realization.type) {
    case 'SelectingRealization':
      if (realization.standaloneSelection) {
        collectSelectionCapabilities(
          realization.standaloneSelection,
          capabilities
        )
        collectLayoutCapabilities(
          realization.standaloneSelection.localLayout,
          capabilities
        )
      }
      realization.workspaceRealizations.forEach((workspace) => {
        capabilities.add(
          workspace.mode === 'DirectSelection'
            ? 'DirectWorkspaceSelection'
            : 'ReferencedWorkspaceSelection'
        )
        workspace.choiceRealizations.forEach(({ realizationAnchor }) =>
          collectAnchorCapability(realizationAnchor, capabilities)
        )
      })
      break
    case 'OrderingRealization':
      capabilities.add(
        realization.mode === 'DirectOrdering'
          ? 'DirectOrdering'
          : 'OrderNotation'
      )
      capabilities.add('TextualPresentation')
      collectLayoutCapabilities(
        realization.presentation.localLayout,
        capabilities
      )
      break
    case 'RelatingRealization':
      capabilities.add(
        realization.mode === 'DirectRelationConstruction'
          ? 'DirectRelationConstruction'
          : 'RelationNotation'
      )
      capabilities.add('TextualPresentation')
      collectLayoutCapabilities(
        realization.sourceSetPresentation.localLayout,
        capabilities
      )
      collectLayoutCapabilities(
        realization.targetSetPresentation.localLayout,
        capabilities
      )
      break
    case 'CompletingRealization':
      realization.gapRealizations.forEach((gap) => {
        capabilities.add(
          gap.responsePlacement === 'Embedded'
            ? 'EmbeddedGapResponse'
            : 'ReferencedGapResponse'
        )
        collectAnchorCapability(gap.realizationAnchor, capabilities)
        if (gap.type === 'InputGapRealization') {
          capabilities.add('ScalarResponse')
        } else if (gap.assignmentMode === 'DirectPlacement') {
          capabilities.add('DirectItemPlacement')
        } else if (gap.selectionPresentation) {
          collectSelectionCapabilities(gap.selectionPresentation, capabilities)
          collectLayoutCapabilities(
            gap.selectionPresentation.localLayout,
            capabilities
          )
        }
      })
      if (realization.itemSource) {
        capabilities.add('TextualPresentation')
        collectLayoutCapabilities(
          realization.itemSource.localLayout,
          capabilities
        )
      }
      break
    case 'ShortInputRealization':
      capabilities.add('ScalarResponse')
      break
    case 'EssayRealization':
      capabilities.add('ExtendedTextResponse')
      break
    case 'ArtifactSubmissionRealization':
      capabilities.add(
        realization.submissionMode === 'DigitalSubmission'
          ? 'DigitalArtifactSubmission'
          : 'PhysicalArtifactSubmission'
      )
      break
    case 'MarkingRealization': {
      const marking =
        qdInteraction?.type === 'Marking' ? qdInteraction : undefined
      if (marking)
        capabilities.add(
          marking.markType === 'Point'
            ? 'PointMarking'
            : marking.markType === 'Region'
              ? 'RegionMarking'
              : 'TextSpanMarking'
        )
      break
    }
  }
}

function collectSelectionCapabilities(
  selection: SelectionPresentation,
  capabilities: Set<QFDCapability>
): void {
  capabilities.add(
    selection.mode === 'Expanded' ? 'ExpandedSelection' : 'CollapsedSelection'
  )
  capabilities.add('TextualPresentation')
}

function collectAnchorCapability(
  anchor: RealizationAnchor | undefined,
  capabilities: Set<QFDCapability>
): void {
  if (!anchor) return
  capabilities.add(
    anchor.kind === 'TextRealizationAnchor'
      ? 'TextAnchoredPlacement'
      : 'RegionAnchoredPlacement'
  )
}

function collectLayoutCapabilities(
  layout: LayoutElement,
  capabilities: Set<QFDCapability>
): void {
  if (layout.kind === 'LayoutPlacement') return
  capabilities.add(
    layout.orientation === 'Horizontal'
      ? 'HorizontalComposition'
      : 'VerticalComposition'
  )
  layout.children.forEach((child) =>
    collectLayoutCapabilities(child, capabilities)
  )
}

function normalizeQdDependencies(
  qd: QuestionDefinition
): Map<string, DependencyConstraint> {
  const normalized = new Map<string, DependencyConstraint>()
  for (const constraint of qd.constraints) {
    if (constraint.type !== 'Dependency') continue
    const key = dependencyKey(constraint)
    const existing = normalized.get(key)
    if (!existing || constraint.strength === 'Required')
      normalized.set(key, constraint)
  }
  return normalized
}

function dependencyCapabilities(dependency: {
  rule: DependencyConstraint['rule']
  exposurePolicy: DependencyConstraint['exposurePolicy']
}): QFDCapability[] {
  return [
    dependency.rule === 'RequiresCompletion'
      ? 'CompletionGating'
      : 'CorrectnessGating',
    ...(dependency.exposurePolicy === 'ConcealedUntilSatisfied'
      ? (['ConditionalConcealment'] as const)
      : []),
  ]
}

function dependencyKey(dependency: {
  predecessorInteractionRef: string
  successorInteractionRef: string
  rule: DependencyConstraint['rule']
  exposurePolicy: DependencyConstraint['exposurePolicy']
}): string {
  return [
    dependency.predecessorInteractionRef,
    dependency.successorInteractionRef,
    dependency.rule,
    dependency.exposurePolicy,
  ].join('::')
}

import type { ResponseMechanism, ResponseMechanismDescriptor } from '../model'

/** Framework-level mechanism registry (QFD-FB-1.2 plan Section 5). Mechanism
 * realization requirements are expressed here, data-driven, rather than through
 * scattered conditionals in the validation/feasibility/conformance engines. */
export const MECHANISM_DESCRIPTORS: Record<
  ResponseMechanism,
  ResponseMechanismDescriptor
> = {
  ListSelection: {
    mechanism: 'ListSelection',
    compatibleInteractionTypes: new Set(['Selecting']),
    canonicalResponseKind: 'Set<ChoiceRef>',
    requiredLayoutCapabilities: new Set(['Stack', 'Grid', 'Inline', 'Canvas']),
    requiresElementLevelPlacement: false,
    workspaceIntegrationRequirements:
      'Workspace integration presents the choice list directly against the stimulus; no per-choice placement.',
    normalizationAdapterId: 'ListSelection',
  },
  SpatialSelection: {
    mechanism: 'SpatialSelection',
    compatibleInteractionTypes: new Set(['Selecting']),
    canonicalResponseKind: 'Set<ChoiceRef>',
    requiredLayoutCapabilities: new Set(['Canvas']),
    requiresElementLevelPlacement: true,
    workspaceIntegrationRequirements:
      'Every Choice must receive concrete placement within one integrated Canvas composition over the Workspace stimulus.',
    normalizationAdapterId: 'SpatialSelection',
  },
  DirectOrdering: {
    mechanism: 'DirectOrdering',
    compatibleInteractionTypes: new Set(['Ordering']),
    canonicalResponseKind: 'OrderedList<OrderingItemRef>',
    requiredLayoutCapabilities: new Set(['Stack', 'Grid', 'Inline', 'Canvas']),
    requiresElementLevelPlacement: false,
    workspaceIntegrationRequirements:
      'Direct manipulation of item order within a single presentation; no Workspace stimulus placement.',
    normalizationAdapterId: 'DirectOrdering',
  },
  OrderNotation: {
    mechanism: 'OrderNotation',
    compatibleInteractionTypes: new Set(['Ordering']),
    canonicalResponseKind: 'OrderedList<OrderingItemRef>',
    requiredLayoutCapabilities: new Set(['Stack', 'Grid', 'Canvas']),
    requiresElementLevelPlacement: false,
    workspaceIntegrationRequirements:
      'Rank notation attached to the item list; no Workspace stimulus placement.',
    normalizationAdapterId: 'OrderNotation',
  },
  DirectRelationConstruction: {
    mechanism: 'DirectRelationConstruction',
    compatibleInteractionTypes: new Set(['Relating']),
    canonicalResponseKind: 'Set<SourceTargetPair>',
    requiredLayoutCapabilities: new Set(['Grid', 'Canvas', 'Stack']),
    requiresElementLevelPlacement: false,
    workspaceIntegrationRequirements:
      'Two visible element sets with direct edge construction; no Workspace stimulus placement.',
    normalizationAdapterId: 'DirectRelationConstruction',
  },
  RelationNotation: {
    mechanism: 'RelationNotation',
    compatibleInteractionTypes: new Set(['Relating']),
    canonicalResponseKind: 'Set<SourceTargetPair>',
    requiredLayoutCapabilities: new Set(['Grid', 'Stack', 'Canvas']),
    requiresElementLevelPlacement: false,
    workspaceIntegrationRequirements:
      'Pair notation entries attached to target elements; no Workspace stimulus placement.',
    normalizationAdapterId: 'RelationNotation',
  },
  Completion: {
    mechanism: 'Completion',
    compatibleInteractionTypes: new Set(['Completing']),
    canonicalResponseKind: 'Map<GapRef,GapResponse>',
    requiredLayoutCapabilities: new Set(['Inline', 'Stack', 'Grid', 'Canvas']),
    requiresElementLevelPlacement: true,
    workspaceIntegrationRequirements:
      'Stimulus-hosted gaps must be placed concretely within the realized host (Inline markers or Canvas regions).',
    normalizationAdapterId: 'Completion',
  },
  ShortEntry: {
    mechanism: 'ShortEntry',
    compatibleInteractionTypes: new Set(['ShortInput']),
    canonicalResponseKind: 'TypedScalar',
    requiredLayoutCapabilities: new Set(['Stack', 'Grid', 'Inline', 'Canvas']),
    requiresElementLevelPlacement: false,
    workspaceIntegrationRequirements:
      'A single typed input field; no Workspace stimulus placement.',
    normalizationAdapterId: 'ShortEntry',
  },
  ExtendedTextEntry: {
    mechanism: 'ExtendedTextEntry',
    compatibleInteractionTypes: new Set(['Essay']),
    canonicalResponseKind: 'ExtendedText',
    requiredLayoutCapabilities: new Set(['Stack', 'Canvas']),
    requiresElementLevelPlacement: false,
    workspaceIntegrationRequirements:
      'An extended text entry surface; no Workspace stimulus placement.',
    normalizationAdapterId: 'ExtendedTextEntry',
  },
  DigitalArtifactSubmission: {
    mechanism: 'DigitalArtifactSubmission',
    compatibleInteractionTypes: new Set(['ArtifactSubmission']),
    canonicalResponseKind: 'Artifact[]',
    requiredLayoutCapabilities: new Set(['Stack', 'Canvas']),
    requiresElementLevelPlacement: false,
    workspaceIntegrationRequirements:
      'A digital upload/submission channel; no Workspace stimulus placement.',
    normalizationAdapterId: 'DigitalArtifactSubmission',
  },
  PhysicalArtifactSubmission: {
    mechanism: 'PhysicalArtifactSubmission',
    compatibleInteractionTypes: new Set(['ArtifactSubmission']),
    canonicalResponseKind: 'Artifact[]',
    requiredLayoutCapabilities: new Set(['Stack', 'Canvas']),
    requiresElementLevelPlacement: false,
    workspaceIntegrationRequirements:
      'A designated physical submission area; no Workspace stimulus placement.',
    normalizationAdapterId: 'PhysicalArtifactSubmission',
  },
  DirectMarking: {
    mechanism: 'DirectMarking',
    compatibleInteractionTypes: new Set(['Marking']),
    canonicalResponseKind: 'Mark[]',
    requiredLayoutCapabilities: new Set(['Canvas', 'Inline']),
    requiresElementLevelPlacement: false,
    workspaceIntegrationRequirements:
      'Direct marking must be integrated with the exact QD-required Workspace stimulus (image surface or selectable text).',
    normalizationAdapterId: 'DirectMarking',
  },
}

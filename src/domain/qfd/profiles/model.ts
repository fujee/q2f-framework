import type { Id, StimulusModality } from '../../qd/model'

export type QFDCapability =
  | 'TextualPresentation'
  | 'ExpandedSelection'
  | 'CollapsedSelection'
  | 'DirectWorkspaceSelection'
  | 'ReferencedWorkspaceSelection'
  | 'DirectOrdering'
  | 'OrderNotation'
  | 'DirectRelationConstruction'
  | 'RelationNotation'
  | 'DirectItemPlacement'
  | 'EmbeddedGapResponse'
  | 'ReferencedGapResponse'
  | 'ScalarResponse'
  | 'ExtendedTextResponse'
  | 'DigitalArtifactSubmission'
  | 'PhysicalArtifactSubmission'
  | 'PointMarking'
  | 'RegionMarking'
  | 'TextSpanMarking'
  | 'HorizontalComposition'
  | 'VerticalComposition'
  | 'TextAnchoredPlacement'
  | 'RegionAnchoredPlacement'
  | 'LogicalInteractionPrecedence'
  | 'CompletionGating'
  | 'CorrectnessGating'
  | 'ConditionalConcealment'

export interface QuestionFormProfile {
  id: Id
  supportedStimulusModalities: StimulusModality[]
  capabilities: QFDCapability[]
}

/** Non-semantic repository metadata; never a capability source. */
export interface QuestionFormProfileRecord {
  profile: QuestionFormProfile
  metadata?: {
    displayName?: string
    mediumFamily?: string
  }
}

export const QFD_CAPABILITIES: ReadonlySet<QFDCapability> = new Set([
  'TextualPresentation',
  'ExpandedSelection',
  'CollapsedSelection',
  'DirectWorkspaceSelection',
  'ReferencedWorkspaceSelection',
  'DirectOrdering',
  'OrderNotation',
  'DirectRelationConstruction',
  'RelationNotation',
  'DirectItemPlacement',
  'EmbeddedGapResponse',
  'ReferencedGapResponse',
  'ScalarResponse',
  'ExtendedTextResponse',
  'DigitalArtifactSubmission',
  'PhysicalArtifactSubmission',
  'PointMarking',
  'RegionMarking',
  'TextSpanMarking',
  'HorizontalComposition',
  'VerticalComposition',
  'TextAnchoredPlacement',
  'RegionAnchoredPlacement',
  'LogicalInteractionPrecedence',
  'CompletionGating',
  'CorrectnessGating',
  'ConditionalConcealment',
])

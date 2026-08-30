import type { QuestionFormProfileRecord } from './model'

export const INTERACTIVE_WEB_PROFILE_RECORD: QuestionFormProfileRecord = {
  profile: {
    id: 'InteractiveWebProfile',
    supportedStimulusModalities: ['Text', 'Image', 'Audio', 'Video'],
    capabilities: [
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
    ],
  },
  metadata: {
    displayName: 'Interactive Web Profile',
    mediumFamily: 'InteractiveWeb',
  },
}

export const CONVENTIONAL_PAPER_PROFILE_RECORD: QuestionFormProfileRecord = {
  profile: {
    id: 'ConventionalPaperProfile',
    supportedStimulusModalities: ['Text', 'Image'],
    capabilities: [
      'TextualPresentation',
      'ExpandedSelection',
      'ReferencedWorkspaceSelection',
      'OrderNotation',
      'DirectRelationConstruction',
      'RelationNotation',
      'EmbeddedGapResponse',
      'ReferencedGapResponse',
      'ScalarResponse',
      'ExtendedTextResponse',
      'PhysicalArtifactSubmission',
      'PointMarking',
      'RegionMarking',
      'TextSpanMarking',
      'HorizontalComposition',
      'VerticalComposition',
      'TextAnchoredPlacement',
      'RegionAnchoredPlacement',
      'LogicalInteractionPrecedence',
    ],
  },
  metadata: {
    displayName: 'Conventional Paper Profile',
    mediumFamily: 'ConventionalPaper',
  },
}

export const INTERACTIVE_WEB_PROFILE = INTERACTIVE_WEB_PROFILE_RECORD.profile
export const CONVENTIONAL_PAPER_PROFILE =
  CONVENTIONAL_PAPER_PROFILE_RECORD.profile

export const PROFILE_REGISTRY = {
  InteractiveWebProfile: INTERACTIVE_WEB_PROFILE_RECORD,
  ConventionalPaperProfile: CONVENTIONAL_PAPER_PROFILE_RECORD,
} as const

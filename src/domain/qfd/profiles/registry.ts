import type { QuestionFormProfile } from '../model'

/** InteractiveWebProfile — reference profile (QFD-FB-1.2 plan Section 17.1 /
 * rules catalog Section 9). */
export const INTERACTIVE_WEB_PROFILE: QuestionFormProfile = {
  id: 'InteractiveWebProfile',
  name: 'Interactive Web Profile',
  mediumFamily: 'InteractiveWeb',
  supportedStimulusTypes: new Set(['Text', 'Image', 'Audio', 'Video']),
  supportedResponseMechanisms: new Set([
    'ListSelection',
    'SpatialSelection',
    'DirectOrdering',
    'OrderNotation',
    'DirectRelationConstruction',
    'RelationNotation',
    'Completion',
    'ShortEntry',
    'ExtendedTextEntry',
    'DigitalArtifactSubmission',
    'DirectMarking',
  ]),
  supportedLayoutCapabilities: new Set(['Stack', 'Grid', 'Canvas', 'Inline']),
  supportedDependencyCapabilities: new Set([
    'RequiresCompletion',
    'RequiresCorrectness',
  ]),
}

/** ConventionalPaperProfile — reference profile (QFD-FB-1.2 plan Section 17.2 /
 * rules catalog Section 10). Canvas here means static two-dimensional placement
 * on the printed page, not an interactive digital canvas. */
export const CONVENTIONAL_PAPER_PROFILE: QuestionFormProfile = {
  id: 'ConventionalPaperProfile',
  name: 'Conventional Paper Profile',
  mediumFamily: 'ConventionalPaper',
  supportedStimulusTypes: new Set(['Text', 'Image']),
  supportedResponseMechanisms: new Set([
    'ListSelection',
    'SpatialSelection',
    'OrderNotation',
    'DirectRelationConstruction',
    'RelationNotation',
    'Completion',
    'ShortEntry',
    'ExtendedTextEntry',
    'PhysicalArtifactSubmission',
    'DirectMarking',
  ]),
  supportedLayoutCapabilities: new Set(['Stack', 'Grid', 'Canvas', 'Inline']),
  supportedDependencyCapabilities: new Set(),
}

export const PROFILE_REGISTRY: Record<string, QuestionFormProfile> = {
  InteractiveWebProfile: INTERACTIVE_WEB_PROFILE,
  ConventionalPaperProfile: CONVENTIONAL_PAPER_PROFILE,
}

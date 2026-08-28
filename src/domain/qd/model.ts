import type { ReferenceContentCarrier } from './implementation/contentCarrier'

/** Scientific Question Definition model from q2f-docs@ad6cccc.
 * Authoring/persistence metadata deliberately lives outside this module.
 */
export type Id = string
export type ResponseInteractionRef = Id
export type StimulusRef = Id
export type ChoiceRef = Id
export type OrderingItemRef = Id
export type RelatingElementRef = Id
export type CompletingGapRef = Id
export type CompletingItemRef = Id

/**
 * Scientifically abstract Content, represented by either a plain carrier or
 * reference-implementation metadata that can verify SourceAnchor support.
 */
export type Content = string | ReferenceContentCarrier
export type TypedValue = string | number

export interface QuestionDefinition {
  id: Id
  responseInteractions: ResponseInteraction[]
  stimuli: Stimulus[]
  associations: InteractionStimulusAssociation[]
  constraints: QuestionConstraint[]
}

export type ResponseInteractionType = ResponseInteraction['type']
export interface ResponseInteractionBase {
  id: Id
  instruction?: string
}
export type ItemOrderPolicy = 'Fixed' | 'Permutable'

export interface TextAnchor {
  kind: 'TextAnchor'
  /** Optional reference-implementation locator payload; scientifically opaque. */
  payload?: unknown
}
export interface RegionAnchor {
  kind: 'RegionAnchor'
  /** Optional reference-implementation locator payload; scientifically opaque. */
  payload?: unknown
}
export type SourceAnchor = TextAnchor | RegionAnchor

export interface Choice {
  id: Id
  semanticContent: string
  isCorrect: boolean
  workspaceStimulusRef?: StimulusRef
  placementSpecification?: string
  sourceAnchor?: SourceAnchor
}
export interface Selecting extends ResponseInteractionBase {
  type: 'Selecting'
  minSelections: number
  maxSelections: number
  standaloneChoiceOrderPolicy?: ItemOrderPolicy
  choices: Choice[]
}

export interface OrderingItem {
  id: Id
  semanticContent: string
}
export interface Ordering extends ResponseInteractionBase {
  type: 'Ordering'
  itemOrderPolicy: ItemOrderPolicy
  orderingItems: OrderingItem[]
  correctOrder: OrderingItemRef[]
}

export type RelatingMappingType =
  'OneToOne' | 'OneToMany' | 'ManyToOne' | 'ManyToMany'
export type ParticipationPolicy = 'Required' | 'Optional'
export interface RelatingElement {
  id: Id
  semanticContent: string
}
export interface RelatingSet {
  label?: string
  elementOrderPolicy: ItemOrderPolicy
  relatingElements: RelatingElement[]
}
export interface CorrectRelation {
  sourceElementRef: RelatingElementRef
  targetElementRef: RelatingElementRef
}
export interface Relating extends ResponseInteractionBase {
  type: 'Relating'
  mappingType: RelatingMappingType
  sourceParticipationPolicy: ParticipationPolicy
  sourceSet: RelatingSet
  targetSet: RelatingSet
  correctRelations: CorrectRelation[]
}

export type InputType = 'Text' | 'Integer' | 'Number' | 'Date'
export interface CompletingGapBase {
  id: Id
  workspaceStimulusRef: StimulusRef
  placementSpecification?: string
  sourceAnchor?: SourceAnchor
}
export interface InputGap extends CompletingGapBase {
  type: 'InputGap'
  inputType: InputType
  correctValues: TypedValue[]
  caseSensitive?: boolean
  minValue?: TypedValue
  maxValue?: TypedValue
}
export interface ItemGap extends CompletingGapBase {
  type: 'ItemGap'
  correctItemRefs: CompletingItemRef[]
}
export type CompletingGap = InputGap | ItemGap
export type GapType = CompletingGap['type']
export interface CompletingItem {
  id: Id
  semanticContent: string
  usageLimit?: number
}
export interface Completing extends ResponseInteractionBase {
  type: 'Completing'
  completingGaps: CompletingGap[]
  completingItems: CompletingItem[]
}

export interface ShortInput extends ResponseInteractionBase {
  type: 'ShortInput'
  inputType: InputType
  correctValues: TypedValue[]
  caseSensitive?: boolean
  minValue?: TypedValue
  maxValue?: TypedValue
}

export type EssayLengthUnit = 'Words' | 'Characters'
export interface Essay extends ResponseInteractionBase {
  type: 'Essay'
  minLength?: number
  maxLength?: number
  lengthUnit?: EssayLengthUnit
}
export interface ArtifactSubmission extends ResponseInteractionBase {
  type: 'ArtifactSubmission'
  minArtifacts: number
  maxArtifacts?: number
  artifactSpecification: string
}
export type MarkType = 'Point' | 'Region' | 'TextSpan'
export interface Marking extends ResponseInteractionBase {
  type: 'Marking'
  markType: MarkType
  minMarks: number
  maxMarks?: number
}
export type ResponseInteraction =
  | Selecting
  | Ordering
  | Relating
  | Completing
  | ShortInput
  | Essay
  | ArtifactSubmission
  | Marking

export type StimulusModality = 'Text' | 'Image' | 'Audio' | 'Video'
export type MaterializationPolicy = 'Fixed' | 'Adaptable' | 'SpecificationBased'
export interface Stimulus {
  id: Id
  sourceContent?: Content
  allowedModalities: StimulusModality[]
  materializationPolicy: MaterializationPolicy
  contentSpecification?: string
}

export type StimulusRole = 'Context' | 'Workspace'
export interface InteractionStimulusAssociation {
  interactionRef: ResponseInteractionRef
  stimulusRef: StimulusRef
  role: StimulusRole
}

export type ConstraintStrength = 'Required' | 'Preferred'
export type DependencyRule = 'RequiresCompletion' | 'RequiresCorrectness'
export type ExposurePolicy = 'Unrestricted' | 'ConcealedUntilSatisfied'
export interface SequenceConstraint {
  type: 'Sequence'
  interactionRefs: ResponseInteractionRef[]
}
export interface DependencyConstraint {
  type: 'Dependency'
  predecessorInteractionRef: ResponseInteractionRef
  successorInteractionRef: ResponseInteractionRef
  rule: DependencyRule
  exposurePolicy: ExposurePolicy
  strength: ConstraintStrength
}
export type QuestionConstraint = SequenceConstraint | DependencyConstraint

export const OBJECTIVE_INTERACTION_TYPES: ReadonlySet<ResponseInteractionType> =
  new Set(['Selecting', 'Ordering', 'Relating', 'Completing', 'ShortInput'])

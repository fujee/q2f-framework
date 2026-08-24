/**
 * QD-FB-2.1 — QuestionDefinition Frozen Baseline, formal domain model.
 *
 * This module is an isolated, from-scratch implementation of the "frozen scientific
 * framework" described in the CODEX_* specification set. It intentionally does NOT
 * reuse or extend the pre-existing informal model under `src/models/*`, because the
 * two models diverge on naming, cardinalities, and structural rules. Keeping this as
 * a separate namespace lets the QD-FB-2.1 engine be built and tested in isolation
 * without destabilizing the already-working application.
 *
 * Section references (e.g. "Section 6") refer to the QD plan document.
 */

// ---------------------------------------------------------------------------
// Identifiers and formal references
// ---------------------------------------------------------------------------

/** A stable, globally unique identifier. `code` fields are author-facing labels
 * and must never be used as formal references (Section 16). */
export type Id = string

export type ResponseInteractionRef = Id
export type StimulusRef = Id
export type ChoiceRef = Id
export type OrderingItemRef = Id
export type RelatingElementRef = Id
export type CompletingGapRef = Id
export type CompletingItemRef = Id
export type QuestionCategoryRef = Id

// ---------------------------------------------------------------------------
// Root aggregate
// ---------------------------------------------------------------------------

export type QuestionStatus = 'Draft' | 'Active' | 'Archived' | 'Deprecated'

export interface QuestionDefinition {
  id: Id
  shortDescription?: string
  longDescription?: string
  status: QuestionStatus
  /** Opaque category references; QD-FB-2.1 does not define category rules. */
  categories: QuestionCategoryRef[]
  /** Required: a QuestionDefinition must carry at least one ResponseInteraction. */
  responseInteractions: ResponseInteraction[]
  stimuli: Stimulus[]
  interactionStimulusAssociations: InteractionStimulusAssociation[]
  constraints: QuestionConstraint[]
  /** Minimal provenance relation; there is no revision/versioning subsystem. */
  derivedFrom?: Id
}

// ---------------------------------------------------------------------------
// ResponseInteraction — common shape
// ---------------------------------------------------------------------------

export type ResponseInteractionType =
  | 'Selecting'
  | 'Ordering'
  | 'Relating'
  | 'Completing'
  | 'ShortInput'
  | 'Essay'
  | 'ArtifactSubmission'
  | 'Marking'

export interface ResponseInteractionBase {
  id: Id
  code: string
  instruction?: string
}

export type ItemOrderPolicy = 'Fixed' | 'Permutable'

// --- Selecting --------------------------------------------------------------

export interface Choice {
  id: Id
  code: string
  name: string
  isCorrect: boolean
}

export interface Selecting extends ResponseInteractionBase {
  type: 'Selecting'
  choices: Choice[]
  minSelections: number
  maxSelections: number
  itemOrderPolicy: ItemOrderPolicy
}

// --- Ordering ----------------------------------------------------------------

export interface OrderingItem {
  id: Id
  code: string
  name: string
}

export interface Ordering extends ResponseInteractionBase {
  type: 'Ordering'
  orderingItems: OrderingItem[]
  correctOrder: OrderingItemRef[]
  itemOrderPolicy: ItemOrderPolicy
}

// --- Relating ------------------------------------------------------------------

export type RelatingMappingType =
  'OneToOne' | 'OneToMany' | 'ManyToOne' | 'ManyToMany'
export type ParticipationPolicy = 'Required' | 'Optional'

export interface RelatingElement {
  id: Id
  code: string
  name: string
}

export interface RelatingSet {
  code: string
  name: string
  elementOrderPolicy: ItemOrderPolicy
  relatingElements: RelatingElement[]
}

export interface CorrectRelation {
  sourceElementRef: RelatingElementRef
  targetElementRef: RelatingElementRef
}

export interface Relating extends ResponseInteractionBase {
  type: 'Relating'
  sourceSet: RelatingSet
  targetSet: RelatingSet
  mappingType: RelatingMappingType
  sourceParticipationPolicy: ParticipationPolicy
  correctRelations: CorrectRelation[]
}

// --- Completing ------------------------------------------------------------------

export interface TextAnchor {
  kind: 'TextAnchor'
  marker: string
}

export interface RegionAnchor {
  kind: 'RegionAnchor'
  /** Normalized [0,1) coordinates relative to the hosting image. */
  x: number
  y: number
  width: number
  height: number
}

export type Anchor = TextAnchor | RegionAnchor

interface CompletingGapBase {
  id: Id
  code: string
  /** When set, this gap is hosted by a Stimulus (must have an explicit Workspace
   * association, see ASC-005/CMP-004). When absent, the gap is hosted by the
   * interaction's own `localContent`. */
  stimulusRef?: StimulusRef
  anchor?: Anchor
  /** Required when hosted by a SpecificationBased stimulus without a concrete anchor. */
  placementSpecification?: string
}

export interface TextInputGap extends CompletingGapBase {
  type: 'TextInputGap'
  correctValues: string[]
  minLength?: number
  maxLength?: number
  caseSensitive: boolean
  trimWhitespace: boolean
}

export interface NumberInputGap extends CompletingGapBase {
  type: 'NumberInputGap'
  correctValues: number[]
  minValue?: number
  maxValue?: number
}

export interface DateInputGap extends CompletingGapBase {
  type: 'DateInputGap'
  /** ISO-8601 date strings (YYYY-MM-DD), lexicographically comparable. */
  correctValues: string[]
  minValue?: string
  maxValue?: string
}

export interface DropTargetGap extends CompletingGapBase {
  type: 'DropTargetGap'
  /** Alternative acceptable items; a response selects exactly one of these. */
  correctItemRefs: CompletingItemRef[]
}

export type CompletingGap =
  TextInputGap | NumberInputGap | DateInputGap | DropTargetGap
export type GapType = CompletingGap['type']

export type CompletingItemUsageLimit = number | 'Unlimited'

interface CompletingItemBase {
  id: Id
  code: string
  usageLimit: CompletingItemUsageLimit
}

export interface TextCompletingItem extends CompletingItemBase {
  type: 'TextCompletingItem'
  text: string
}

export interface ImageCompletingItem extends CompletingItemBase {
  type: 'ImageCompletingItem'
  imageRef: string
}

export type CompletingItem = TextCompletingItem | ImageCompletingItem

export interface Completing extends ResponseInteractionBase {
  type: 'Completing'
  /** Content hosting gaps that are not associated with a Stimulus. */
  localContent?: string
  completingGaps: CompletingGap[]
  completingItems: CompletingItem[]
}

// --- ShortInput ------------------------------------------------------------------

interface ShortInputBase extends ResponseInteractionBase {
  type: 'ShortInput'
}

export interface TextShortInput extends ShortInputBase {
  inputType: 'Text'
  correctValues: string[]
  minLength?: number
  maxLength?: number
  caseSensitive: boolean
  trimWhitespace: boolean
}

export interface NumberShortInput extends ShortInputBase {
  inputType: 'Number'
  correctValues: number[]
  minValue?: number
  maxValue?: number
}

export interface DateShortInput extends ShortInputBase {
  inputType: 'Date'
  correctValues: string[]
  minValue?: string
  maxValue?: string
}

export type ShortInput = TextShortInput | NumberShortInput | DateShortInput

// --- Essay ------------------------------------------------------------------

export type EssayLengthUnit = 'Words' | 'Characters'

export interface Essay extends ResponseInteractionBase {
  type: 'Essay'
  minLength?: number
  maxLength?: number
  lengthUnit?: EssayLengthUnit
}

// --- ArtifactSubmission ------------------------------------------------------------------

export interface ArtifactSubmission extends ResponseInteractionBase {
  type: 'ArtifactSubmission'
  minArtifacts: number
  maxArtifacts?: number
  artifactSpecification: string
}

// --- Marking ------------------------------------------------------------------

export type MarkType = 'Point' | 'Region' | 'TextSpan'

export interface Marking extends ResponseInteractionBase {
  type: 'Marking'
  markType: MarkType
  minMarks: number
  maxMarks: number
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

// ---------------------------------------------------------------------------
// Stimulus
// ---------------------------------------------------------------------------

export type MaterializationPolicy = 'Fixed' | 'Adaptable' | 'SpecificationBased'

interface StimulusBase {
  id: Id
  code: string
  description: string
  materializationPolicy: MaterializationPolicy
  /** Required for Adaptable and SpecificationBased stimuli (STM-002/STM-003). */
  contentSpecification?: string
  /** Response-visible transcript/caption or other response-relevant supplemental
   * content (STM-004). Whether one is *needed* is an authoring judgment that
   * cannot be derived automatically; this engine only checks internal consistency
   * of whatever is declared. */
  transcript?: string
}

export interface TextStimulus extends StimulusBase {
  type: 'Text'
  content?: string
}

export interface ImageStimulus extends StimulusBase {
  type: 'Image'
  source?: string
}

export interface AudioStimulus extends StimulusBase {
  type: 'Audio'
  source?: string
}

export interface VideoStimulus extends StimulusBase {
  type: 'Video'
  source?: string
}

export type Stimulus =
  TextStimulus | ImageStimulus | AudioStimulus | VideoStimulus
export type StimulusType = Stimulus['type']

// ---------------------------------------------------------------------------
// InteractionStimulusAssociation
// ---------------------------------------------------------------------------

export type AssociationRole = 'Context' | 'Workspace'

export interface InteractionStimulusAssociation {
  id: Id
  interactionRef: ResponseInteractionRef
  stimulusRef: StimulusRef
  role: AssociationRole
}

// ---------------------------------------------------------------------------
// QuestionConstraint
// ---------------------------------------------------------------------------

export type ConstraintStrength = 'Required' | 'Preferred'

interface QuestionConstraintBase {
  id: Id
  description?: string
  strength: ConstraintStrength
}

export interface SequenceConstraint extends QuestionConstraintBase {
  type: 'Sequence'
  interactionRefs: ResponseInteractionRef[]
}

export type DependencyRule = 'RequiresCompletion' | 'RequiresCorrectness'

export interface DependencyConstraint extends QuestionConstraintBase {
  type: 'Dependency'
  predecessorInteractionRef: ResponseInteractionRef
  successorInteractionRef: ResponseInteractionRef
  rule: DependencyRule
}

export type QuestionConstraint = SequenceConstraint | DependencyConstraint

/** The five ResponseInteraction types that have a formally defined notion of
 * "correctness" (Section: DEP-003). */
export const OBJECTIVE_INTERACTION_TYPES: ReadonlySet<ResponseInteractionType> =
  new Set(['Selecting', 'Ordering', 'Relating', 'Completing', 'ShortInput'])

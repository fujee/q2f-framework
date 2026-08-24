/**
 * QFD-FB-1.2 — QuestionFormDefinition Frozen Baseline, formal domain model.
 *
 * A QuestionFormDefinition (QFD) realizes exactly one QuestionDefinition (QD) for
 * one target QuestionFormProfile. QFD carries realization decisions only — it must
 * never copy QD semantic/correctness data, and it never redefines QD semantics.
 *
 * QFD-FB-1.2 supersedes QFD-FB-1.1. There is no `InstructionBlock`; optional
 * medium-specific instruction text lives on `InteractionRealization.realizedInstruction`.
 * QD sequence/dependency constraints are not copied into QFD (they are enforced
 * directly against QD by the renderer/runtime and checked by conformance rules).
 */

import type {
  Id,
  ResponseInteractionRef,
  ResponseInteractionType,
  StimulusRef,
  StimulusType,
  TextAnchor,
} from '../qd/model'

export type QuestionDefinitionRef = Id

// ---------------------------------------------------------------------------
// QuestionFormProfile — reusable capability contract for a delivery medium
// ---------------------------------------------------------------------------

export type ProfileId = 'InteractiveWebProfile' | 'ConventionalPaperProfile'
export type QuestionFormProfileRef = ProfileId

export type LayoutCapability = 'Stack' | 'Grid' | 'Canvas' | 'Inline'

/** The two QD dependency rules that require *dynamic*, runtime-enforced support
 * from a target profile in order to be usable as a Required dependency. */
export type DependencyCapability = 'RequiresCompletion' | 'RequiresCorrectness'

export interface QuestionFormProfile {
  id: ProfileId
  name: string
  mediumFamily: string
  supportedStimulusTypes: ReadonlySet<StimulusType>
  supportedResponseMechanisms: ReadonlySet<ResponseMechanism>
  supportedLayoutCapabilities: ReadonlySet<LayoutCapability>
  supportedDependencyCapabilities: ReadonlySet<DependencyCapability>
}

// ---------------------------------------------------------------------------
// ResponseMechanism — a realization technique, not a UI control
// ---------------------------------------------------------------------------

export type ResponseMechanism =
  | 'ListSelection'
  | 'SpatialSelection'
  | 'DirectOrdering'
  | 'OrderNotation'
  | 'DirectRelationConstruction'
  | 'RelationNotation'
  | 'Completion'
  | 'ShortEntry'
  | 'ExtendedTextEntry'
  | 'DigitalArtifactSubmission'
  | 'PhysicalArtifactSubmission'
  | 'DirectMarking'

/** The canonical, medium-independent response shape produced by a QD interaction
 * once a mechanism response is normalized (Section 4 canonical response principle). */
export type CanonicalResponseKind =
  | 'Set<ChoiceRef>'
  | 'OrderedList<OrderingItemRef>'
  | 'Set<SourceTargetPair>'
  | 'Map<GapRef,GapResponse>'
  | 'TypedScalar'
  | 'ExtendedText'
  | 'Artifact[]'
  | 'Mark[]'

/** Framework-level descriptor: makes a mechanism's realization requirements
 * explicit and extensible rather than scattering conditionals through the code. */
export interface ResponseMechanismDescriptor {
  mechanism: ResponseMechanism
  compatibleInteractionTypes: ReadonlySet<ResponseInteractionType>
  canonicalResponseKind: CanonicalResponseKind
  requiredLayoutCapabilities: ReadonlySet<LayoutCapability>
  /** Whether this mechanism, when integrating a Workspace association, must give
   * every relevant QD response element (e.g. every Choice) its own concrete
   * placement in the layout (as opposed to a single undifferentiated surface). */
  requiresElementLevelPlacement: boolean
  /** Descriptive requirement for how the mechanism must integrate a Workspace
   * association (QFD plan Section 5: `workspaceIntegrationRequirements`).
   * Documentation-level; deterministic checks live in the conformance engine. */
  workspaceIntegrationRequirements: string
  /** Identifies the normalization function that maps a raw mechanism response to
   * `canonicalResponseKind`. Not a scoring/correctness contract. */
  normalizationAdapterId: string
}

// ---------------------------------------------------------------------------
// InteractionRealization
// ---------------------------------------------------------------------------

export interface InteractionRealization {
  id: Id
  interactionRef: ResponseInteractionRef
  mechanism: ResponseMechanism
  /** Optional medium-specific instruction reformulation. Absent means the
   * renderer uses the QD instruction verbatim. */
  realizedInstruction?: string
}

// ---------------------------------------------------------------------------
// StimulusRealization
// ---------------------------------------------------------------------------

export type StimulusRealizationMode =
  'ReuseSource' | 'AdaptSource' | 'MaterializeFromSpecification'

export interface StimulusRealization {
  id: Id
  stimulusRef: StimulusRef
  mode: StimulusRealizationMode
  /** Required for AdaptSource/MaterializeFromSpecification; absent for ReuseSource. */
  realizedContent?: string
}

// ---------------------------------------------------------------------------
// Layout model
// ---------------------------------------------------------------------------

export interface Stack {
  kind: 'Stack'
  direction: 'Vertical' | 'Horizontal'
  children: LayoutElement[]
}

export interface GridItem {
  child: LayoutElement
  row: number
  column: number
  rowSpan: number
  columnSpan: number
}

export interface Grid {
  kind: 'Grid'
  rows: number
  columns: number
  /** Explicit logical order, independent of (row, column) geometry. */
  items: GridItem[]
}

export interface CanvasArea {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasItem {
  child: LayoutElement
  area: CanvasArea
  /** Affects visual stacking only; never logical presentation order. */
  layer: number
}

export interface Canvas {
  kind: 'Canvas'
  /** Explicit logical order, independent of area/layer. Overlap is allowed. */
  items: CanvasItem[]
}

export interface InlineItem {
  child: LayoutElement
  anchor?: TextAnchor
}

export interface Inline {
  kind: 'Inline'
  /** Explicit logical order. */
  items: InlineItem[]
}

export type ContainerElement = Stack | Grid | Canvas | Inline

export interface StimulusBlock {
  kind: 'StimulusBlock'
  stimulusRealizationRef: Id
}

export interface InteractionBlock {
  kind: 'InteractionBlock'
  interactionRealizationRef: Id
}

/** QD response-element kinds that may need independent placement inside a
 * Workspace composition (e.g. one Choice placed at a specific Canvas region). */
export type ResponseElementKind =
  'Choice' | 'OrderingItem' | 'RelatingElement' | 'CompletingGap'

export interface ResponseElementBlock {
  kind: 'ResponseElementBlock'
  elementKind: ResponseElementKind
  /** References the QD element by id; owner interaction is derived from QD, not
   * duplicated here. */
  elementRef: Id
}

export type ContentElement =
  StimulusBlock | InteractionBlock | ResponseElementBlock

export type LayoutElement = ContainerElement | ContentElement

// ---------------------------------------------------------------------------
// Root aggregate
// ---------------------------------------------------------------------------

export interface QuestionFormDefinition {
  id: Id
  questionDefinitionRef: QuestionDefinitionRef
  targetProfileRef: QuestionFormProfileRef
  interactionRealizations: InteractionRealization[]
  stimulusRealizations: StimulusRealization[]
  /** Must be a ContainerElement; typed as such, but still checked at runtime
   * (QFD-VAL-LAY-002) since data may originate from untyped/external sources. */
  rootLayout: ContainerElement
}

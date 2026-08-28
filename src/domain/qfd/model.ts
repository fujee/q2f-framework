/** Scientific QFD model from q2f-docs@ad6cccc. */
import type {
  ChoiceRef,
  CompletingGapRef,
  CompletingItemRef,
  Content,
  DependencyRule,
  ExposurePolicy,
  Id,
  OrderingItemRef,
  RelatingElementRef,
  ResponseInteractionRef,
  StimulusModality,
  StimulusRef,
} from '../qd/model'

export type QuestionDefinitionRef = Id
export type QuestionFormProfileRef = Id

export type StimulusRealizationMode =
  'PreserveContent' | 'AdaptContent' | 'MaterializeFromSpecification'

export interface StimulusRealization {
  id: Id
  stimulusRef: StimulusRef
  servedInteractionRefs: ResponseInteractionRef[]
  realizedModality: StimulusModality
  mode: StimulusRealizationMode
  realizedContent?: Content
}

export type InstructionRole = 'TaskInstruction' | 'OperationalGuidance'
export interface InstructionRealization {
  id: Id
  role: InstructionRole
  realizedText?: string
}

/** QFD-side typed refs preserve the applicable QD ownership scope. */
export type ResponseElementRef =
  | {
      kind: 'Choice'
      interactionRef: ResponseInteractionRef
      choiceRef: ChoiceRef
    }
  | {
      kind: 'OrderingItem'
      interactionRef: ResponseInteractionRef
      orderingItemRef: OrderingItemRef
    }
  | {
      kind: 'RelatingElement'
      interactionRef: ResponseInteractionRef
      set: 'Source' | 'Target'
      relatingElementRef: RelatingElementRef
    }
  | {
      kind: 'CompletingItem'
      interactionRef: ResponseInteractionRef
      completingItemRef: CompletingItemRef
    }

export interface ElementPresentation {
  id: Id
  elementRef: ResponseElementRef
  realizedText?: string
}

export interface ResponseSiteRealization {
  id: Id
}

export type SelectionPresentationMode = 'Expanded' | 'Collapsed'
export interface SelectionPresentation {
  id: Id
  mode: SelectionPresentationMode
  optionPresentations: ElementPresentation[]
  localLayout: LayoutElement
}

export type LayoutOrientation = 'Horizontal' | 'Vertical'
export type LayoutableRealizationKind =
  | 'StimulusRealization'
  | 'InstructionRealization'
  | 'ElementPresentation'
  | 'SelectionPresentation'
  | 'OrderingPresentation'
  | 'RelatingSetPresentation'
  | 'CompletingItemSourceRealization'
  | 'ResponseSiteRealization'

/** Resolved in the applicable outer or composite-local layout context. */
export interface LayoutableRealizationRef {
  kind: LayoutableRealizationKind
  id: Id
}

export interface LayoutGroup {
  kind: 'LayoutGroup'
  orientation: LayoutOrientation
  children: LayoutElement[]
}
export interface LayoutPlacement {
  kind: 'LayoutPlacement'
  realizationRef: LayoutableRealizationRef
}
export type LayoutElement = LayoutGroup | LayoutPlacement

export interface TextRealizationAnchor {
  kind: 'TextRealizationAnchor'
  /** Optional reference-implementation locator payload; scientifically opaque. */
  payload?: unknown
}
export interface RegionRealizationAnchor {
  kind: 'RegionRealizationAnchor'
  /** Optional reference-implementation locator payload; scientifically opaque. */
  payload?: unknown
}
export type RealizationAnchor = TextRealizationAnchor | RegionRealizationAnchor

export interface InteractionRealizationBase {
  interactionRef: ResponseInteractionRef
  instructionRealizations: InstructionRealization[]
}

export type WorkspaceSelectionMode = 'DirectSelection' | 'ReferencedSelection'
export interface WorkspaceChoiceRealization {
  choiceRef: ChoiceRef
  realizationAnchor?: RealizationAnchor
}
export interface SelectingWorkspaceRealization {
  stimulusRealizationRef: Id
  mode: WorkspaceSelectionMode
  choiceRealizations: WorkspaceChoiceRealization[]
  referencedResponseSite?: ResponseSiteRealization
}
export interface SelectingRealization extends InteractionRealizationBase {
  type: 'SelectingRealization'
  standaloneSelection?: SelectionPresentation
  workspaceRealizations: SelectingWorkspaceRealization[]
}

export type OrderingMode = 'DirectOrdering' | 'OrderNotation'
export interface OrderingPresentation {
  id: Id
  itemPresentations: ElementPresentation[]
  localLayout: LayoutElement
}
export interface OrderingRealization extends InteractionRealizationBase {
  type: 'OrderingRealization'
  mode: OrderingMode
  presentation: OrderingPresentation
}

export type RelatingMode = 'DirectRelationConstruction' | 'RelationNotation'
export interface RelatingSetPresentation {
  id: Id
  realizedLabel?: string
  elementPresentations: ElementPresentation[]
  localLayout: LayoutElement
}
export interface RelatingRealization extends InteractionRealizationBase {
  type: 'RelatingRealization'
  mode: RelatingMode
  sourceSetPresentation: RelatingSetPresentation
  targetSetPresentation: RelatingSetPresentation
  notationResponseSite?: ResponseSiteRealization
}

export type GapResponsePlacement = 'Embedded' | 'Referenced'
export interface CompletingGapRealizationBase {
  gapRef: CompletingGapRef
  stimulusRealizationRef: Id
  realizationAnchor?: RealizationAnchor
  responsePlacement: GapResponsePlacement
}
export interface InputGapRealization extends CompletingGapRealizationBase {
  type: 'InputGapRealization'
  responseSite: ResponseSiteRealization
}
export type ItemAssignmentMode = 'DirectPlacement' | 'ItemSelection'
export interface ItemGapRealization extends CompletingGapRealizationBase {
  type: 'ItemGapRealization'
  assignmentMode: ItemAssignmentMode
  selectionPresentation?: SelectionPresentation
  referencedPlacementSite?: ResponseSiteRealization
}
export type CompletingGapRealization = InputGapRealization | ItemGapRealization
export interface CompletingItemSourceRealization {
  id: Id
  itemPresentations: ElementPresentation[]
  localLayout: LayoutElement
}
export interface CompletingRealization extends InteractionRealizationBase {
  type: 'CompletingRealization'
  gapRealizations: CompletingGapRealization[]
  itemSource?: CompletingItemSourceRealization
}

export interface ShortInputRealization extends InteractionRealizationBase {
  type: 'ShortInputRealization'
  responseSite: ResponseSiteRealization
}
export interface EssayRealization extends InteractionRealizationBase {
  type: 'EssayRealization'
  responseSite: ResponseSiteRealization
}
export type ArtifactSubmissionMode = 'DigitalSubmission' | 'PhysicalSubmission'
export interface ArtifactSubmissionRealization extends InteractionRealizationBase {
  type: 'ArtifactSubmissionRealization'
  submissionMode: ArtifactSubmissionMode
  submissionSite: ResponseSiteRealization
}
export interface MarkingRealization extends InteractionRealizationBase {
  type: 'MarkingRealization'
  workspaceRealizationRef: Id
}

export type InteractionRealization =
  | SelectingRealization
  | OrderingRealization
  | RelatingRealization
  | CompletingRealization
  | ShortInputRealization
  | EssayRealization
  | ArtifactSubmissionRealization
  | MarkingRealization

export interface InteractionPrecedence {
  beforeInteractionRef: ResponseInteractionRef
  afterInteractionRef: ResponseInteractionRef
}
export interface DependencyRealization {
  predecessorInteractionRef: ResponseInteractionRef
  successorInteractionRef: ResponseInteractionRef
  rule: DependencyRule
  exposurePolicy: ExposurePolicy
}

export interface QuestionFormDefinition {
  questionDefinitionRef: QuestionDefinitionRef
  targetProfileRef: QuestionFormProfileRef
  interactionRealizations: InteractionRealization[]
  stimulusRealizations: StimulusRealization[]
  interactionPrecedences: InteractionPrecedence[]
  dependencyRealizations: DependencyRealization[]
  rootLayout: LayoutElement
}

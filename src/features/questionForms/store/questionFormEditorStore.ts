import { create } from 'zustand'
import type { QuestionDefinition, TextAnchor } from '@/domain/qd/model'
import type {
  ContainerElement,
  LayoutElement,
  ProfileId,
  QuestionFormDefinition,
  ResponseMechanism,
  StimulusRealizationMode,
} from '@/domain/qfd/model'
import {
  addChild,
  moveChild,
  removeChildAt,
  updateCanvasItemSlot,
  updateContainerAtPath,
  updateContainerProps,
  updateGridItemSlot,
  updateInlineItemAnchor,
  type LayoutPath,
  type NewCanvasSlot,
  type NewGridSlot,
  type NewInlineSlot,
} from '../lib/layoutTree'

export interface StimulusRealizationDraft {
  mode: StimulusRealizationMode
  realizedContent: string
}

export interface QuestionFormDraft {
  questionId: string | null
  qd: QuestionDefinition | null
  /** When set, the wizard edits this QFD instead of creating a new one. */
  existingFormId: string | null
  targetProfileRef: ProfileId
  mechanisms: Record<string, ResponseMechanism | ''>
  realizedInstructions: Record<string, string>
  stimulusRealizations: Record<string, StimulusRealizationDraft>
  /** Original InteractionRealization ids, keyed by interactionRef (edit mode). */
  interactionRealizationIds: Record<string, string>
  /** Original StimulusRealization ids, keyed by stimulusRef (edit mode). */
  stimulusRealizationIds: Record<string, string>
  rootLayout: ContainerElement | null
}

const EMPTY_DRAFT: QuestionFormDraft = {
  questionId: null,
  qd: null,
  existingFormId: null,
  targetProfileRef: 'InteractiveWebProfile',
  mechanisms: {},
  realizedInstructions: {},
  stimulusRealizations: {},
  interactionRealizationIds: {},
  stimulusRealizationIds: {},
  rootLayout: null,
}

export interface QuestionFormEditorState {
  currentStep: number
  draft: QuestionFormDraft
  initForQuestion: (qd: QuestionDefinition) => void
  initFromExisting: (
    qd: QuestionDefinition,
    qfd: QuestionFormDefinition
  ) => void
  setCurrentStep: (step: number) => void
  setTargetProfileRef: (profileId: ProfileId) => void
  setMechanism: (
    interactionId: string,
    mechanism: ResponseMechanism | ''
  ) => void
  setRealizedInstruction: (interactionId: string, text: string) => void
  setStimulusRealization: (
    stimulusId: string,
    draft: StimulusRealizationDraft
  ) => void
  setRootLayout: (layout: ContainerElement | null) => void
  addLayoutChild: (
    path: LayoutPath,
    child: LayoutElement,
    slot?: NewGridSlot | NewCanvasSlot | NewInlineSlot
  ) => void
  removeLayoutChild: (path: LayoutPath, index: number) => void
  moveLayoutChild: (path: LayoutPath, from: number, to: number) => void
  updateLayoutContainerProps: (
    path: LayoutPath,
    patch: Record<string, unknown>
  ) => void
  updateLayoutGridSlot: (
    path: LayoutPath,
    index: number,
    patch: Partial<NewGridSlot>
  ) => void
  updateLayoutCanvasSlot: (
    path: LayoutPath,
    index: number,
    patch: Partial<NewCanvasSlot>
  ) => void
  updateLayoutInlineAnchor: (
    path: LayoutPath,
    index: number,
    anchor: TextAnchor | undefined
  ) => void
  reset: () => void
}

export const WIZARD_STEP_COUNT = 5

export const useQuestionFormEditorStore = create<QuestionFormEditorState>()(
  (set) => ({
    currentStep: 1,
    draft: { ...EMPTY_DRAFT },

    initForQuestion: (qd) =>
      set({
        currentStep: 1,
        draft: {
          ...EMPTY_DRAFT,
          questionId: qd.id,
          qd,
        },
      }),

    initFromExisting: (qd, qfd) =>
      set({
        currentStep: 1,
        draft: {
          ...EMPTY_DRAFT,
          questionId: qd.id,
          qd,
          existingFormId: qfd.id,
          targetProfileRef: qfd.targetProfileRef,
          mechanisms: Object.fromEntries(
            qfd.interactionRealizations.map((ir) => [
              ir.interactionRef,
              ir.mechanism,
            ])
          ),
          realizedInstructions: Object.fromEntries(
            qfd.interactionRealizations.map((ir) => [
              ir.interactionRef,
              ir.realizedInstruction ?? '',
            ])
          ),
          stimulusRealizations: Object.fromEntries(
            qfd.stimulusRealizations.map((sr) => [
              sr.stimulusRef,
              { mode: sr.mode, realizedContent: sr.realizedContent ?? '' },
            ])
          ),
          interactionRealizationIds: Object.fromEntries(
            qfd.interactionRealizations.map((ir) => [ir.interactionRef, ir.id])
          ),
          stimulusRealizationIds: Object.fromEntries(
            qfd.stimulusRealizations.map((sr) => [sr.stimulusRef, sr.id])
          ),
          rootLayout: qfd.rootLayout,
        },
      }),

    setCurrentStep: (step) => set({ currentStep: step }),

    setTargetProfileRef: (profileId) =>
      set((state) => ({
        draft: { ...state.draft, targetProfileRef: profileId },
      })),

    setMechanism: (interactionId, mechanism) =>
      set((state) => ({
        draft: {
          ...state.draft,
          mechanisms: { ...state.draft.mechanisms, [interactionId]: mechanism },
        },
      })),

    setRealizedInstruction: (interactionId, text) =>
      set((state) => ({
        draft: {
          ...state.draft,
          realizedInstructions: {
            ...state.draft.realizedInstructions,
            [interactionId]: text,
          },
        },
      })),

    setStimulusRealization: (stimulusId, srDraft) =>
      set((state) => ({
        draft: {
          ...state.draft,
          stimulusRealizations: {
            ...state.draft.stimulusRealizations,
            [stimulusId]: srDraft,
          },
        },
      })),

    setRootLayout: (layout) =>
      set((state) => ({ draft: { ...state.draft, rootLayout: layout } })),

    addLayoutChild: (path, child, slot) =>
      set((state) => {
        if (!state.draft.rootLayout) return state
        const rootLayout = updateContainerAtPath(
          state.draft.rootLayout,
          path,
          (c) => addChild(c, child, slot)
        )
        return { draft: { ...state.draft, rootLayout } }
      }),

    removeLayoutChild: (path, index) =>
      set((state) => {
        if (!state.draft.rootLayout) return state
        const rootLayout = updateContainerAtPath(
          state.draft.rootLayout,
          path,
          (c) => removeChildAt(c, index)
        )
        return { draft: { ...state.draft, rootLayout } }
      }),

    moveLayoutChild: (path, from, to) =>
      set((state) => {
        if (!state.draft.rootLayout) return state
        const rootLayout = updateContainerAtPath(
          state.draft.rootLayout,
          path,
          (c) => moveChild(c, from, to)
        )
        return { draft: { ...state.draft, rootLayout } }
      }),

    updateLayoutContainerProps: (path, patch) =>
      set((state) => {
        if (!state.draft.rootLayout) return state
        const rootLayout = updateContainerAtPath(
          state.draft.rootLayout,
          path,
          (c) => updateContainerProps(c, patch)
        )
        return { draft: { ...state.draft, rootLayout } }
      }),

    updateLayoutGridSlot: (path, index, patch) =>
      set((state) => {
        if (!state.draft.rootLayout) return state
        const rootLayout = updateContainerAtPath(
          state.draft.rootLayout,
          path,
          (c) => updateGridItemSlot(c, index, patch)
        )
        return { draft: { ...state.draft, rootLayout } }
      }),

    updateLayoutCanvasSlot: (path, index, patch) =>
      set((state) => {
        if (!state.draft.rootLayout) return state
        const rootLayout = updateContainerAtPath(
          state.draft.rootLayout,
          path,
          (c) => updateCanvasItemSlot(c, index, patch)
        )
        return { draft: { ...state.draft, rootLayout } }
      }),

    updateLayoutInlineAnchor: (path, index, anchor) =>
      set((state) => {
        if (!state.draft.rootLayout) return state
        const rootLayout = updateContainerAtPath(
          state.draft.rootLayout,
          path,
          (c) => updateInlineItemAnchor(c, index, anchor)
        )
        return { draft: { ...state.draft, rootLayout } }
      }),

    reset: () => set({ currentStep: 1, draft: { ...EMPTY_DRAFT } }),
  })
)

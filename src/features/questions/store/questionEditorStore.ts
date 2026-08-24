import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AssociationRole,
  InteractionStimulusAssociation,
  QuestionConstraint,
  QuestionStatus,
  ResponseInteraction,
  Stimulus,
} from '@/domain/qd/model'
import type { QuestionDetailDto } from '@/api/questions/questionsApi'

export interface QuestionDraft {
  shortDescription: string
  longDescription: string
  status: QuestionStatus
  categories: string[]
  stimuli: Stimulus[]
  responseInteractions: ResponseInteraction[]
  interactionStimulusAssociations: InteractionStimulusAssociation[]
  constraints: QuestionConstraint[]
}

const EMPTY_DRAFT: QuestionDraft = {
  shortDescription: '',
  longDescription: '',
  status: 'Draft',
  categories: [],
  stimuli: [],
  responseInteractions: [],
  interactionStimulusAssociations: [],
  constraints: [],
}

export interface QuestionEditorState {
  questionId: string | null
  currentStep: number
  draft: QuestionDraft
  isDirty: boolean
  initNew: () => void
  initFromQuestion: (question: QuestionDetailDto) => void
  setCurrentStep: (step: number) => void
  updateDraft: (
    patch: Partial<
      Omit<
        QuestionDraft,
        | 'stimuli'
        | 'responseInteractions'
        | 'interactionStimulusAssociations'
        | 'constraints'
      >
    >
  ) => void
  addStimulus: (stimulus: Stimulus) => void
  updateStimulus: (id: string, updated: Stimulus) => void
  removeStimulus: (id: string) => void
  addInteraction: (interaction: ResponseInteraction) => void
  updateInteraction: (id: string, updated: ResponseInteraction) => void
  removeInteraction: (id: string) => void
  addAssociation: (assoc: InteractionStimulusAssociation) => void
  removeAssociation: (id: string) => void
  updateAssociationRole: (id: string, role: AssociationRole) => void
  addConstraint: (constraint: QuestionConstraint) => void
  updateConstraint: (id: string, updated: QuestionConstraint) => void
  removeConstraint: (id: string) => void
  reset: () => void
}

export const WIZARD_STEP_COUNT = 6

export const useQuestionEditorStore = create<QuestionEditorState>()(
  persist(
    (set) => ({
      questionId: null,
      currentStep: 1,
      draft: { ...EMPTY_DRAFT },
      isDirty: false,

      initNew: () =>
        set({
          questionId: null,
          currentStep: 1,
          draft: { ...EMPTY_DRAFT },
          isDirty: false,
        }),

      initFromQuestion: (question) => {
        set({
          questionId: question.id,
          currentStep: 1,
          draft: {
            shortDescription: question.shortDescription ?? '',
            longDescription: question.longDescription ?? '',
            status: question.status,
            categories: question.categories.map((c) => c.categoryId),
            stimuli: question.stimuli,
            responseInteractions: question.responseInteractions,
            interactionStimulusAssociations:
              question.interactionStimulusAssociations,
            constraints: question.constraints,
          },
          isDirty: false,
        })
      },

      setCurrentStep: (step) => set({ currentStep: step }),

      updateDraft: (patch) =>
        set((state) => ({
          draft: { ...state.draft, ...patch },
          isDirty: true,
        })),

      addStimulus: (stimulus) =>
        set((state) => ({
          draft: {
            ...state.draft,
            stimuli: [...state.draft.stimuli, stimulus],
          },
          isDirty: true,
        })),

      updateStimulus: (id, updated) =>
        set((state) => ({
          draft: {
            ...state.draft,
            stimuli: state.draft.stimuli.map((s) =>
              s.id === id ? updated : s
            ),
          },
          isDirty: true,
        })),

      removeStimulus: (id) =>
        set((state) => ({
          draft: {
            ...state.draft,
            stimuli: state.draft.stimuli.filter((s) => s.id !== id),
          },
          isDirty: true,
        })),

      addInteraction: (interaction) =>
        set((state) => ({
          draft: {
            ...state.draft,
            responseInteractions: [
              ...state.draft.responseInteractions,
              interaction,
            ],
          },
          isDirty: true,
        })),

      updateInteraction: (id, updated) =>
        set((state) => ({
          draft: {
            ...state.draft,
            responseInteractions: state.draft.responseInteractions.map((i) =>
              i.id === id ? updated : i
            ),
          },
          isDirty: true,
        })),

      removeInteraction: (id) =>
        set((state) => ({
          draft: {
            ...state.draft,
            responseInteractions: state.draft.responseInteractions.filter(
              (i) => i.id !== id
            ),
          },
          isDirty: true,
        })),

      addAssociation: (assoc) =>
        set((state) => ({
          draft: {
            ...state.draft,
            interactionStimulusAssociations: [
              ...state.draft.interactionStimulusAssociations,
              assoc,
            ],
          },
          isDirty: true,
        })),

      removeAssociation: (id) =>
        set((state) => ({
          draft: {
            ...state.draft,
            interactionStimulusAssociations:
              state.draft.interactionStimulusAssociations.filter(
                (a) => a.id !== id
              ),
          },
          isDirty: true,
        })),

      updateAssociationRole: (id, role) =>
        set((state) => ({
          draft: {
            ...state.draft,
            interactionStimulusAssociations:
              state.draft.interactionStimulusAssociations.map((a) =>
                a.id === id ? { ...a, role } : a
              ),
          },
          isDirty: true,
        })),

      addConstraint: (constraint) =>
        set((state) => ({
          draft: {
            ...state.draft,
            constraints: [...state.draft.constraints, constraint],
          },
          isDirty: true,
        })),

      updateConstraint: (id, updated) =>
        set((state) => ({
          draft: {
            ...state.draft,
            constraints: state.draft.constraints.map((c) =>
              c.id === id ? updated : c
            ),
          },
          isDirty: true,
        })),

      removeConstraint: (id) =>
        set((state) => ({
          draft: {
            ...state.draft,
            constraints: state.draft.constraints.filter((c) => c.id !== id),
          },
          isDirty: true,
        })),

      reset: () =>
        set({
          questionId: null,
          currentStep: 1,
          draft: { ...EMPTY_DRAFT },
          isDirty: false,
        }),
    }),
    {
      name: 'tmstudio-question-editor',
      // Bumped for the QD-FB-2.1 migration: the draft shape is fundamentally
      // incompatible with prior versions, so older persisted state is discarded
      // rather than migrated field-by-field.
      version: 5,
      storage: createJSONStorage(() => sessionStorage),
      migrate: () => ({
        questionId: null,
        currentStep: 1,
        draft: { ...EMPTY_DRAFT },
        isDirty: false,
      }),
    }
  )
)

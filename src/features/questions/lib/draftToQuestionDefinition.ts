import type { QuestionDefinition } from '@/domain/qd/model'
import type { QuestionDraft } from '@/features/questions/store/questionEditorStore'

/** Builds the QD-FB-2.1 aggregate from the in-progress wizard draft, for validation
 * purposes. `id` is a placeholder until the question is actually saved. */
export function draftToQuestionDefinition(
  draft: QuestionDraft,
  questionId: string | null
): QuestionDefinition {
  return {
    id: questionId ?? 'draft',
    shortDescription: draft.shortDescription,
    longDescription: draft.longDescription,
    status: draft.status,
    categories: draft.categories,
    stimuli: draft.stimuli,
    responseInteractions: draft.responseInteractions,
    interactionStimulusAssociations: draft.interactionStimulusAssociations,
    constraints: draft.constraints,
  }
}

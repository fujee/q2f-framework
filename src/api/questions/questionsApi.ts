import { api } from '../client'
import type {
  InteractionStimulusAssociation,
  QuestionConstraint,
  QuestionStatus,
  ResponseInteraction,
  Stimulus,
} from '@/domain/qd/model'

export interface QuestionCategoryRef {
  categoryId: string
  categoryName: string
  categorizationId: string
  categorizationName: string
}

export interface QuestionListItemDto {
  id: string
  shortDescription: string
  longDescription: string
  status: QuestionStatus
  categories: QuestionCategoryRef[]
}

/** The full QuestionDefinition aggregate: stimuli, interactions, associations and
 * constraints are owned parts of the question and are saved/loaded as a single unit. */
export interface QuestionDetailDto extends QuestionListItemDto {
  stimuli: Stimulus[]
  responseInteractions: ResponseInteraction[]
  interactionStimulusAssociations: InteractionStimulusAssociation[]
  constraints: QuestionConstraint[]
}

export interface CreateQuestionDto {
  shortDescription: string
  longDescription: string
  status: QuestionStatus
  categoryIds: string[]
  stimuli: Stimulus[]
  responseInteractions: ResponseInteraction[]
  interactionStimulusAssociations: InteractionStimulusAssociation[]
  constraints: QuestionConstraint[]
}

export type UpdateQuestionDto = Partial<CreateQuestionDto>

export const questionsApi = {
  list: () => api.get<QuestionListItemDto[]>('/questions'),
  getById: (id: string) => api.get<QuestionDetailDto>(`/questions/${id}`),
  create: (data: CreateQuestionDto) =>
    api.post<QuestionDetailDto>('/questions', data),
  update: (id: string, data: UpdateQuestionDto) =>
    api.put<QuestionDetailDto>(`/questions/${id}`, data),
  delete: (id: string) => api.delete(`/questions/${id}`),
}

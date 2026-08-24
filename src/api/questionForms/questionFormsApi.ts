import { api } from '../client'
import type { QuestionFormDefinition } from '@/domain/qfd/model'

export type CreateQuestionFormDto = Omit<QuestionFormDefinition, 'id'>

export const questionFormsApi = {
  listByQuestion: (questionId: string) =>
    api.get<QuestionFormDefinition[]>(
      `/question-forms?questionDefinitionRef=${encodeURIComponent(questionId)}`
    ),
  getById: (id: string) =>
    api.get<QuestionFormDefinition>(`/question-forms/${id}`),
  create: (data: CreateQuestionFormDto) =>
    api.post<QuestionFormDefinition>('/question-forms', data),
  update: (id: string, data: CreateQuestionFormDto) =>
    api.put<QuestionFormDefinition>(`/question-forms/${id}`, data),
  delete: (id: string) => api.delete(`/question-forms/${id}`),
}

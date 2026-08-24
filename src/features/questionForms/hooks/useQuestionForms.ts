import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { questionFormsApi } from '@/api/questionForms/questionFormsApi'
import type { CreateQuestionFormDto } from '@/api/questionForms/questionFormsApi'

export const QUESTION_FORMS_KEY = ['question-forms'] as const

export function useQuestionForms(questionId: string) {
  return useQuery({
    queryKey: [...QUESTION_FORMS_KEY, 'by-question', questionId],
    queryFn: () => questionFormsApi.listByQuestion(questionId),
    enabled: !!questionId,
  })
}

export function useQuestionForm(id: string) {
  return useQuery({
    queryKey: [...QUESTION_FORMS_KEY, id],
    queryFn: () => questionFormsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateQuestionForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateQuestionFormDto) => questionFormsApi.create(data),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({
        queryKey: [
          ...QUESTION_FORMS_KEY,
          'by-question',
          created.questionDefinitionRef,
        ],
      })
    },
  })
}

export function useUpdateQuestionForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateQuestionFormDto }) =>
      questionFormsApi.update(id, data),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({
        queryKey: [...QUESTION_FORMS_KEY, updated.id],
      })
      void queryClient.invalidateQueries({
        queryKey: [
          ...QUESTION_FORMS_KEY,
          'by-question',
          updated.questionDefinitionRef,
        ],
      })
    },
  })
}

export function useDeleteQuestionForm(questionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => questionFormsApi.delete(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: [...QUESTION_FORMS_KEY, 'by-question', questionId],
      }),
  })
}

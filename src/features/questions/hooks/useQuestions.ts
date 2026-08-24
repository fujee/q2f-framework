import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { questionsApi } from '@/api/questions/questionsApi'
import type {
  CreateQuestionDto,
  UpdateQuestionDto,
} from '@/api/questions/questionsApi'

export const QUESTIONS_KEY = ['questions'] as const

export function useQuestions() {
  return useQuery({
    queryKey: QUESTIONS_KEY,
    queryFn: questionsApi.list,
  })
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: [...QUESTIONS_KEY, id],
    queryFn: () => questionsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateQuestionDto) => questionsApi.create(data),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: QUESTIONS_KEY }),
  })
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuestionDto }) =>
      questionsApi.update(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: QUESTIONS_KEY })
      void queryClient.invalidateQueries({ queryKey: [...QUESTIONS_KEY, id] })
    },
  })
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => questionsApi.delete(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: QUESTIONS_KEY }),
  })
}

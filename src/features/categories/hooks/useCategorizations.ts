import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categorizationsApi } from '@/api/categories/categorizationsApi'
import type {
  CreateCategorizationDto,
  UpdateCategorizationDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@/api/categories/categorizationsApi'

export const CATEGORIZATIONS_KEY = ['categorizations'] as const

export function useCategorizations() {
  return useQuery({
    queryKey: CATEGORIZATIONS_KEY,
    queryFn: categorizationsApi.list,
  })
}

export function useCreateCategorization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCategorizationDto) =>
      categorizationsApi.create(data),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: CATEGORIZATIONS_KEY }),
  })
}

export function useUpdateCategorization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategorizationDto }) =>
      categorizationsApi.update(id, data),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: CATEGORIZATIONS_KEY }),
  })
}

export function useDeleteCategorization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => categorizationsApi.delete(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: CATEGORIZATIONS_KEY }),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      categorizationId,
      data,
    }: {
      categorizationId: string
      data: CreateCategoryDto
    }) => categorizationsApi.createCategory(categorizationId, data),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: CATEGORIZATIONS_KEY }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      categorizationId,
      categoryId,
      data,
    }: {
      categorizationId: string
      categoryId: string
      data: UpdateCategoryDto
    }) => categorizationsApi.updateCategory(categorizationId, categoryId, data),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: CATEGORIZATIONS_KEY }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      categorizationId,
      categoryId,
    }: {
      categorizationId: string
      categoryId: string
    }) => categorizationsApi.deleteCategory(categorizationId, categoryId),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: CATEGORIZATIONS_KEY }),
  })
}

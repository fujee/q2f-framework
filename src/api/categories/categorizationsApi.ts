import { api } from '../client'

export interface CategoryDto {
  id: string
  name: string
  order: number
}

export interface CategorizationDto {
  id: string
  name: string
  isExclusive: boolean
  categories: CategoryDto[]
}

export interface CreateCategorizationDto {
  name: string
  isExclusive: boolean
}

export interface UpdateCategorizationDto {
  name?: string
  isExclusive?: boolean
}

export interface CreateCategoryDto {
  name: string
  order?: number
}

export interface UpdateCategoryDto {
  name?: string
  order?: number
}

export const categorizationsApi = {
  list: () => api.get<CategorizationDto[]>('/categorizations'),

  create: (data: CreateCategorizationDto) =>
    api.post<CategorizationDto>('/categorizations', data),

  update: (id: string, data: UpdateCategorizationDto) =>
    api.put<CategorizationDto>(`/categorizations/${id}`, data),

  delete: (id: string) => api.delete(`/categorizations/${id}`),

  createCategory: (categorizationId: string, data: CreateCategoryDto) =>
    api.post<CategorizationDto>(
      `/categorizations/${categorizationId}/categories`,
      data
    ),

  updateCategory: (
    categorizationId: string,
    categoryId: string,
    data: UpdateCategoryDto
  ) =>
    api.put<CategorizationDto>(
      `/categorizations/${categorizationId}/categories/${categoryId}`,
      data
    ),

  deleteCategory: (categorizationId: string, categoryId: string) =>
    api.delete(`/categorizations/${categorizationId}/categories/${categoryId}`),
}

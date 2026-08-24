import { z } from 'zod'

export const categorizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  isExclusive: z.boolean(),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
})

export type CategorizationFormData = z.infer<typeof categorizationSchema>
export type CategoryFormData = z.infer<typeof categorySchema>

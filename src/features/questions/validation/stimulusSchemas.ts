import { z } from 'zod'

export const baseStimulusSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code is too long')
    .regex(/^\S+$/, 'Code must not contain spaces'),
  description: z.string().min(1, 'Description is required').max(500),
  materializationPolicy: z.enum(['Fixed', 'Adaptable', 'SpecificationBased']),
  contentSpecification: z.string().optional(),
})

export const textStimulusSchema = baseStimulusSchema.extend({
  content: z.string().optional(),
})

export const imageStimulusSchema = baseStimulusSchema

export const audioStimulusSchema = baseStimulusSchema.extend({
  transcript: z.string().optional(),
})

export const videoStimulusSchema = baseStimulusSchema.extend({
  transcript: z.string().optional(),
})

export type TextStimulusFormData = z.infer<typeof textStimulusSchema>
export type ImageStimulusFormData = z.infer<typeof imageStimulusSchema>
export type AudioStimulusFormData = z.infer<typeof audioStimulusSchema>
export type VideoStimulusFormData = z.infer<typeof videoStimulusSchema>

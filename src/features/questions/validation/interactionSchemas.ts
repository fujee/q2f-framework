import { z } from 'zod'

export const baseInteractionSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code is too long')
    .regex(/^\S+$/, 'Code must not contain spaces'),
  instruction: z.string().max(1000).optional(),
})

const wholeNumber = (message: string) => z.string().regex(/^\d+$/, message)

export const selectingScalarSchema = baseInteractionSchema.extend({
  minSelections: wholeNumber('Must be a whole number').refine(
    (v) => Number(v) >= 1,
    'Must be at least 1'
  ),
  maxSelections: wholeNumber('Must be a whole number').refine(
    (v) => Number(v) >= 1,
    'Must be at least 1'
  ),
  itemOrderPolicy: z.enum(['Fixed', 'Permutable']),
})

export const orderingScalarSchema = baseInteractionSchema.extend({
  itemOrderPolicy: z.enum(['Fixed', 'Permutable']),
})

export const shortInputSchema = baseInteractionSchema.extend({
  inputType: z.enum(['Text', 'Number', 'Date']),
})

export const essaySchema = z.object({
  code: baseInteractionSchema.shape.code,
  instruction: baseInteractionSchema.shape.instruction,
  minLength: z
    .union([
      z.literal(''),
      wholeNumber('Must be a whole number').refine(
        (v) => Number(v) >= 0,
        'Must not be negative'
      ),
    ])
    .optional(),
  maxLength: z
    .union([
      z.literal(''),
      wholeNumber('Must be a whole number').refine(
        (v) => Number(v) > 0,
        'Must be positive'
      ),
    ])
    .optional(),
  lengthUnit: z.enum(['Words', 'Characters']).optional(),
})

export const relatingScalarSchema = baseInteractionSchema.extend({
  mappingType: z.enum(['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany']),
  sourceParticipationPolicy: z.enum(['Required', 'Optional']),
  sourceElementOrderPolicy: z.enum(['Fixed', 'Permutable']),
  targetElementOrderPolicy: z.enum(['Fixed', 'Permutable']),
})

export const artifactSubmissionSchema = baseInteractionSchema.extend({
  minArtifacts: wholeNumber('Must be a whole number').refine(
    (v) => Number(v) >= 1,
    'Must be at least 1'
  ),
  maxArtifacts: z
    .union([
      z.literal(''),
      wholeNumber('Must be a whole number').refine(
        (v) => Number(v) >= 1,
        'Must be at least 1'
      ),
    ])
    .optional(),
  artifactSpecification: z
    .string()
    .min(1, 'Artifact specification is required')
    .max(500),
})

export const markingSchema = baseInteractionSchema.extend({
  markType: z.enum(['Point', 'Region', 'TextSpan']),
  minMarks: wholeNumber('Must be a whole number').refine(
    (v) => Number(v) >= 1,
    'Must be at least 1'
  ),
  maxMarks: wholeNumber('Must be a whole number').refine(
    (v) => Number(v) >= 1,
    'Must be at least 1'
  ),
})

export type BaseInteractionFormData = z.infer<typeof baseInteractionSchema>
export type SelectingScalarFormData = z.infer<typeof selectingScalarSchema>
export type OrderingScalarFormData = z.infer<typeof orderingScalarSchema>
export type ShortInputFormData = z.infer<typeof shortInputSchema>
export type EssayFormData = z.infer<typeof essaySchema>
export type RelatingScalarFormData = z.infer<typeof relatingScalarSchema>
export type ArtifactSubmissionFormData = z.infer<
  typeof artifactSubmissionSchema
>
export type MarkingFormData = z.infer<typeof markingSchema>

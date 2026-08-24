import { z } from 'zod'

export const baseConstraintSchema = z.object({
  description: z.string().max(500, 'Too long').optional(),
  strength: z.enum(['Required', 'Preferred']),
})

export const sequenceConstraintSchema = baseConstraintSchema.extend({
  interactionRefs: z
    .array(z.string())
    .min(2, 'Select at least two interactions'),
})

export const dependencyConstraintSchema = baseConstraintSchema.extend({
  predecessorInteractionRef: z
    .string()
    .min(1, 'Predecessor interaction is required'),
  successorInteractionRef: z
    .string()
    .min(1, 'Successor interaction is required'),
  rule: z.enum(['RequiresCompletion', 'RequiresCorrectness']),
})

export type BaseConstraintFormData = z.infer<typeof baseConstraintSchema>
export type SequenceConstraintFormData = z.infer<
  typeof sequenceConstraintSchema
>
export type DependencyConstraintFormData = z.infer<
  typeof dependencyConstraintSchema
>

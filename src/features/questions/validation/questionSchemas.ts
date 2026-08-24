import { z } from 'zod'

/** Returns true when the HTML string contains at least one visible character. */
function htmlNotEmpty(html: string): boolean {
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text.length > 0
}

export const step1Schema = z.object({
  shortDescription: z
    .string()
    .max(300, 'Short description is too long')
    .refine(htmlNotEmpty, 'Short description is required'),
  longDescription: z
    .string()
    .max(20000, 'Long description is too long')
    .refine(htmlNotEmpty, 'Long description is required'),
  status: z.enum(['Draft', 'Active', 'Archived', 'Deprecated']),
  categoryIds: z.array(z.string()),
})

export type Step1FormData = z.infer<typeof step1Schema>

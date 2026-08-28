import type {
  CompletingGap,
  ResponseInteraction,
  ShortInput,
} from '@/domain/qd/model'

/** Runtime correctness evaluation for `RequiresCorrectness` dependencies. Only
 * the five objective interaction types have formal correctness (DEP-003); any
 * other type evaluates to false. Raw response shapes mirror the mechanism
 * adapters:
 *
 * - Selecting / Ordering → `string[]`
 * - Relating → `{ sourceElementRef, targetElementRef }[]`
 * - Completing → `Record<gapId, itemId | value>`
 * - ShortInput → `string`
 */

function setEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const value of a) if (!b.has(value)) return false
  return true
}

function relationKey(pair: unknown): string | undefined {
  if (typeof pair !== 'object' || pair === null) return undefined
  const rec = pair as Record<string, unknown>
  if (
    typeof rec.sourceElementRef !== 'string' ||
    typeof rec.targetElementRef !== 'string'
  )
    return undefined
  return `${rec.sourceElementRef}::${rec.targetElementRef}`
}

function textMatches(
  value: string,
  correct: string,
  caseSensitive: boolean,
  trimWhitespace: boolean
): boolean {
  const v = trimWhitespace ? value.trim() : value
  const c = trimWhitespace ? correct.trim() : correct
  return caseSensitive ? v === c : v.toLowerCase() === c.toLowerCase()
}

function gapValueCorrect(gap: CompletingGap, value: unknown): boolean {
  switch (gap.type) {
    case 'DropTargetGap':
      return typeof value === 'string' && gap.correctItemRefs.includes(value)
    case 'TextInputGap':
      return (
        typeof value === 'string' &&
        gap.correctValues.some((c) =>
          textMatches(value, c, gap.caseSensitive, gap.trimWhitespace)
        )
      )
    case 'NumberInputGap': {
      if (value === '') return false
      const n =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number(value)
            : Number.NaN
      return Number.isFinite(n) && gap.correctValues.includes(n)
    }
    case 'DateInputGap':
      return typeof value === 'string' && gap.correctValues.includes(value)
  }
}

function shortInputCorrect(interaction: ShortInput, raw: string): boolean {
  switch (interaction.inputType) {
    case 'Text':
      return interaction.correctValues.some((c) =>
        textMatches(
          raw,
          c,
          interaction.caseSensitive,
          interaction.trimWhitespace
        )
      )
    case 'Number': {
      if (raw.trim() === '') return false
      const n = Number(raw.trim())
      return Number.isFinite(n) && interaction.correctValues.includes(n)
    }
    case 'Date':
      return interaction.correctValues.includes(raw.trim())
  }
}

export function isInteractionCorrect(
  interaction: ResponseInteraction,
  raw: unknown
): boolean {
  switch (interaction.type) {
    case 'Selecting': {
      if (!Array.isArray(raw)) return false
      const selected = new Set(
        raw.filter((v): v is string => typeof v === 'string')
      )
      const correct = new Set(
        interaction.choices.filter((c) => c.isCorrect).map((c) => c.id)
      )
      return setEquals(selected, correct)
    }
    case 'Ordering': {
      if (!Array.isArray(raw)) return false
      if (raw.length !== interaction.correctOrder.length) return false
      return raw.every(
        (value, index) => value === interaction.correctOrder[index]
      )
    }
    case 'Relating': {
      if (!Array.isArray(raw)) return false
      const given = new Set<string>()
      for (const pair of raw) {
        const key = relationKey(pair)
        if (!key) return false
        given.add(key)
      }
      const correct = new Set(
        interaction.correctRelations.map(
          (r) => `${r.sourceElementRef}::${r.targetElementRef}`
        )
      )
      return setEquals(given, correct)
    }
    case 'Completing': {
      if (typeof raw !== 'object' || raw === null) return false
      const rec = raw as Record<string, unknown>
      return interaction.completingGaps.every((gap) => {
        const value = rec[gap.id]
        if (value === undefined || value === null || value === '') return false
        return gapValueCorrect(gap, value)
      })
    }
    case 'ShortInput':
      return typeof raw === 'string' && shortInputCorrect(interaction, raw)
    default:
      return false
  }
}

/** Whether a response is non-empty (used for `RequiresCompletion` gating). */
export function isResponseCompleted(raw: unknown): boolean {
  if (raw === undefined || raw === null) return false
  if (typeof raw === 'string') return raw.trim().length > 0
  if (Array.isArray(raw)) return raw.length > 0
  if (typeof raw === 'object') return Object.keys(raw as object).length > 0
  return true
}

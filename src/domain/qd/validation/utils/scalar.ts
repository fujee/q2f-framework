import type { InputType, TypedValue } from '../../model'

export interface ScalarFields {
  inputType: InputType
  correctValues: TypedValue[]
  caseSensitive?: boolean
  minValue?: TypedValue
  maxValue?: TypedValue
}

export function scalarErrors(input: ScalarFields): string[] {
  const errors: string[] = []
  if (input.correctValues.length === 0)
    errors.push('correctValues must be non-empty')
  if (
    new Set(input.correctValues.map(valueKey)).size !==
    input.correctValues.length
  )
    errors.push('correctValues must be a set')
  if (input.inputType === 'Text') {
    if (input.caseSensitive === undefined)
      errors.push('Text requires caseSensitive')
    if (input.minValue !== undefined || input.maxValue !== undefined)
      errors.push('Text cannot declare minValue or maxValue')
  } else if (input.caseSensitive !== undefined) {
    errors.push('non-Text input cannot declare caseSensitive')
  }
  for (const value of input.correctValues) {
    if (!matchesType(input.inputType, value))
      errors.push('correctValue has incompatible type')
  }
  if (
    input.minValue !== undefined &&
    !matchesType(input.inputType, input.minValue)
  )
    errors.push('minValue has incompatible type')
  if (
    input.maxValue !== undefined &&
    !matchesType(input.inputType, input.maxValue)
  )
    errors.push('maxValue has incompatible type')
  if (
    input.minValue !== undefined &&
    input.maxValue !== undefined &&
    matchesType(input.inputType, input.minValue) &&
    matchesType(input.inputType, input.maxValue) &&
    compare(input.minValue, input.maxValue) > 0
  )
    errors.push('minValue must not exceed maxValue')
  for (const value of input.correctValues) {
    if (!matchesType(input.inputType, value)) continue
    if (input.minValue !== undefined && compare(value, input.minValue) < 0)
      errors.push('correctValue is below minValue')
    if (input.maxValue !== undefined && compare(value, input.maxValue) > 0)
      errors.push('correctValue is above maxValue')
  }
  return [...new Set(errors)]
}

function matchesType(type: InputType, value: TypedValue): boolean {
  if (type === 'Text') return typeof value === 'string'
  if (type === 'Date') return typeof value === 'string' && validIsoDate(value)
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  return type === 'Number' || Number.isInteger(value)
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  )
}

function compare(a: TypedValue, b: TypedValue): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function valueKey(value: TypedValue): string {
  return `${typeof value}:${String(value)}`
}

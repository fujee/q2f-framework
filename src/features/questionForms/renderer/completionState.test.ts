import { describe, expect, it } from 'vitest'
import { assignCompletionItem, removeCompletionItem } from './completionState'

describe('completion assignments', () => {
  it('assigns an item to a gap', () => {
    const next = assignCompletionItem({}, 'gap-1', 'co2', 1)
    expect(next['gap-1']).toBe('co2')
  })

  it('moves a usageLimit=1 item when dropped on another gap', () => {
    const next = assignCompletionItem({ 'gap-1': 'co2' }, 'gap-2', 'co2', 1)
    expect(next['gap-1']).toBeUndefined()
    expect(next['gap-2']).toBe('co2')
  })

  it('evicts the earliest gap when a finite limit is exceeded', () => {
    const two = assignCompletionItem(
      assignCompletionItem({}, 'gap-1', 'co2', 2),
      'gap-2',
      'co2',
      2
    )
    expect(two['gap-1']).toBe('co2')
    expect(two['gap-2']).toBe('co2')

    const three = assignCompletionItem(two, 'gap-3', 'co2', 2)
    expect(three['gap-1']).toBeUndefined()
    expect(three['gap-2']).toBe('co2')
    expect(three['gap-3']).toBe('co2')
  })

  it('allows unlimited reuse', () => {
    const one = assignCompletionItem({}, 'gap-1', 'co2', undefined)
    const two = assignCompletionItem(one, 'gap-2', 'co2', undefined)
    expect(two['gap-1']).toBe('co2')
    expect(two['gap-2']).toBe('co2')
  })

  it('removes an assigned item', () => {
    const next = removeCompletionItem({ 'gap-1': 'co2' }, 'gap-1')
    expect(next['gap-1']).toBeUndefined()
  })

  it('reassigning the same item to the same gap is a no-op', () => {
    const next = assignCompletionItem({ 'gap-1': 'co2' }, 'gap-1', 'co2', 1)
    expect(next['gap-1']).toBe('co2')
  })
})

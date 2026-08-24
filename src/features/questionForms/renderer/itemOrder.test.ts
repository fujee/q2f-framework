import { describe, expect, it } from 'vitest'
import { applyItemOrderPolicy } from './itemOrderPolicy'

describe('applyItemOrderPolicy', () => {
  const items = ['A', 'B', 'C', 'D'] as const

  it('Fixed preserves the authored base order', () => {
    expect(applyItemOrderPolicy(items, 'Fixed')).toEqual([...items])
  })

  it('Permutable returns a permutation of the same items', () => {
    const out = applyItemOrderPolicy(items, 'Permutable')
    expect(out).toHaveLength(items.length)
    expect([...out].sort()).toEqual([...items].sort())
  })

  it('never mutates the input array', () => {
    const snapshot = [...items]
    applyItemOrderPolicy(items, 'Permutable')
    expect(items).toEqual(snapshot)
  })
})

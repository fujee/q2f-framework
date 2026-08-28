import { describe, expect, it } from 'vitest'
import { canAddRelation } from './relatingRules'

const none: { source: string; target: string }[] = []

describe('canAddRelation', () => {
  it('rejects duplicates for every mapping type', () => {
    expect(
      canAddRelation([{ source: 's1', target: 't1' }], 'ManyToMany', 's1', 't1')
    ).toBe(false)
  })

  it('OneToOne: each source and target is used at most once', () => {
    expect(canAddRelation(none, 'OneToOne', 's1', 't1')).toBe(true)
    expect(
      canAddRelation([{ source: 's1', target: 't2' }], 'OneToOne', 's1', 't1')
    ).toBe(false) // source already used
    expect(
      canAddRelation([{ source: 's2', target: 't1' }], 'OneToOne', 's1', 't1')
    ).toBe(false) // target already used
  })

  it('OneToMany: a source may repeat but a target may not', () => {
    expect(canAddRelation(none, 'OneToMany', 's1', 't1')).toBe(true)
    expect(
      canAddRelation([{ source: 's1', target: 't1' }], 'OneToMany', 's1', 't2')
    ).toBe(true) // same source, new target
    expect(
      canAddRelation([{ source: 's1', target: 't1' }], 'OneToMany', 's2', 't1')
    ).toBe(false) // target already used
  })

  it('ManyToOne: a target may repeat but a source may not', () => {
    expect(canAddRelation(none, 'ManyToOne', 's1', 't1')).toBe(true)
    expect(
      canAddRelation([{ source: 's1', target: 't1' }], 'ManyToOne', 's2', 't1')
    ).toBe(true) // same target, new source
    expect(
      canAddRelation([{ source: 's1', target: 't1' }], 'ManyToOne', 's1', 't2')
    ).toBe(false) // source already used
  })

  it('ManyToMany: allows arbitrary new relations', () => {
    expect(
      canAddRelation([{ source: 's1', target: 't1' }], 'ManyToMany', 's1', 't2')
    ).toBe(true)
    expect(
      canAddRelation([{ source: 's1', target: 't1' }], 'ManyToMany', 's2', 't1')
    ).toBe(true)
  })
})

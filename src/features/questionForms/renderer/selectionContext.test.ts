import { describe, expect, it } from 'vitest'
import { nextSelection } from './selectionState'

describe('nextSelection (maxSelections enforcement)', () => {
  it('allows selecting up to maxSelections options', () => {
    let s = new Set<string>()
    s = nextSelection(s, 'a', 2)
    s = nextSelection(s, 'b', 2)
    expect(s).toEqual(new Set(['a', 'b']))
  })

  it('does not add a selection beyond maxSelections', () => {
    let s = new Set(['a', 'b'])
    s = nextSelection(s, 'c', 2)
    expect(s).toEqual(new Set(['a', 'b']))
  })

  it('keeps selected options deselectable', () => {
    let s = new Set(['a', 'b'])
    s = nextSelection(s, 'a', 2)
    expect(s).toEqual(new Set(['b']))
  })

  it('deselecting frees a slot for another option', () => {
    let s = new Set(['a', 'b'])
    s = nextSelection(s, 'a', 2)
    s = nextSelection(s, 'c', 2)
    expect(s).toEqual(new Set(['b', 'c']))
  })

  it('maxSelections = 1 behaves like radio (replace, then deselect)', () => {
    let s = new Set(['a'])
    s = nextSelection(s, 'b', 1)
    expect(s).toEqual(new Set(['b']))
    s = nextSelection(s, 'b', 1)
    expect(s).toEqual(new Set())
  })
})

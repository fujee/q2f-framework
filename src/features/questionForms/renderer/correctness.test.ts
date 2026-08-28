import { describe, expect, it } from 'vitest'
import { isInteractionCorrect, isResponseCompleted } from './correctness'
import type { ResponseInteraction } from '@/domain/qd/model'

const shortInput = {
  id: 'i1',
  code: 'I1',
  type: 'ShortInput',
  inputType: 'Number',
  correctValues: [5],
} as ResponseInteraction

const selecting = {
  id: 'i2',
  code: 'I2',
  type: 'Selecting',
  minSelections: 1,
  maxSelections: 1,
  itemOrderPolicy: 'Permutable',
  choices: [
    { id: 'c3', code: '3', name: '3', isCorrect: false },
    { id: 'c4', code: '4', name: '4', isCorrect: true },
    { id: 'c5', code: '5', name: '5', isCorrect: false },
  ],
} as ResponseInteraction

const ordering = {
  id: 'o1',
  code: 'O1',
  type: 'Ordering',
  orderingItems: [
    { id: 'a', code: 'a', name: 'A' },
    { id: 'b', code: 'b', name: 'B' },
  ],
  correctOrder: ['a', 'b'],
  itemOrderPolicy: 'Permutable',
} as ResponseInteraction

const relating = {
  id: 'r1',
  code: 'R1',
  type: 'Relating',
  sourceSet: {
    code: 's',
    name: 'S',
    elementOrderPolicy: 'Fixed',
    relatingElements: [{ id: 'x', code: 'x', name: 'X' }],
  },
  targetSet: {
    code: 't',
    name: 'T',
    elementOrderPolicy: 'Fixed',
    relatingElements: [{ id: 'y', code: 'y', name: 'Y' }],
  },
  mappingType: 'OneToOne',
  sourceParticipationPolicy: 'Required',
  correctRelations: [{ sourceElementRef: 'x', targetElementRef: 'y' }],
} as ResponseInteraction

const completing = {
  id: 'c1',
  code: 'C1',
  type: 'Completing',
  completingGaps: [
    {
      id: 'g1',
      code: 'g1',
      type: 'DropTargetGap',
      correctItemRefs: ['co2'],
    },
  ],
  completingItems: [
    {
      id: 'co2',
      code: 'co2',
      type: 'TextCompletingItem',
      text: 'CO2',
      usageLimit: 1,
    },
  ],
} as ResponseInteraction

describe('isInteractionCorrect', () => {
  it('ShortInput: correct numeric value', () => {
    expect(isInteractionCorrect(shortInput, '5')).toBe(true)
    expect(isInteractionCorrect(shortInput, '4')).toBe(false)
    expect(isInteractionCorrect(shortInput, '')).toBe(false)
  })

  it('Selecting: exact correct set', () => {
    expect(isInteractionCorrect(selecting, ['c4'])).toBe(true)
    expect(isInteractionCorrect(selecting, ['c3'])).toBe(false)
    expect(isInteractionCorrect(selecting, ['c3', 'c4'])).toBe(false)
  })

  it('Ordering: exact sequence', () => {
    expect(isInteractionCorrect(ordering, ['a', 'b'])).toBe(true)
    expect(isInteractionCorrect(ordering, ['b', 'a'])).toBe(false)
  })

  it('Relating: exact relation set', () => {
    expect(
      isInteractionCorrect(relating, [
        { sourceElementRef: 'x', targetElementRef: 'y' },
      ])
    ).toBe(true)
    expect(isInteractionCorrect(relating, [])).toBe(false)
  })

  it('Completing: every gap assigned correctly', () => {
    expect(isInteractionCorrect(completing, { g1: 'co2' })).toBe(true)
    expect(isInteractionCorrect(completing, { g1: 'o2' })).toBe(false)
    expect(isInteractionCorrect(completing, {})).toBe(false)
  })

  it('non-objective types are never correct', () => {
    expect(
      isInteractionCorrect(
        { id: 'e1', type: 'Essay' } as ResponseInteraction,
        'x'
      )
    ).toBe(false)
  })
})

describe('isResponseCompleted', () => {
  it('detects empty vs answered responses', () => {
    expect(isResponseCompleted(undefined)).toBe(false)
    expect(isResponseCompleted('')).toBe(false)
    expect(isResponseCompleted('x')).toBe(true)
    expect(isResponseCompleted([])).toBe(false)
    expect(isResponseCompleted(['x'])).toBe(true)
    expect(isResponseCompleted({})).toBe(false)
    expect(isResponseCompleted({ g1: 'co2' })).toBe(true)
  })
})

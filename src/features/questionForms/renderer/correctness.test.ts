import { describe, expect, it } from 'vitest'
import type { InteractionRealization } from '@/domain/qfd/model'
import type { ResponseInteraction } from '@/domain/qd/model'
import { FROZEN_PRIMARY_CASES } from '@/domain/evaluation/frozenProtocolFixtures'
import { isInteractionCorrect, isResponseCompleted } from './correctness'

function fixture(
  caseId: string,
  interactionRef: string
): { interaction: ResponseInteraction; realization: InteractionRealization } {
  const value = FROZEN_PRIMARY_CASES.find(({ id }) => id === caseId)
  const interaction = value?.qd.responseInteractions.find(
    ({ id }) => id === interactionRef
  )
  const realization = value?.qfd.interactionRealizations.find(
    ({ interactionRef: ref }) => ref === interactionRef
  )
  if (!interaction || !realization)
    throw new Error(`Missing ${caseId}/${interactionRef}.`)
  return { interaction, realization }
}

describe('canonical renderer response acceptance and correctness', () => {
  it('RequiresCompletion accepts only a valid-domain Selecting response', () => {
    const { interaction, realization } = fixture(
      'Q1-InteractiveWebProfile',
      'select'
    )
    expect(isResponseCompleted(interaction, realization, ['he', 'ne'])).toBe(
      true
    )
    expect(
      isResponseCompleted(interaction, realization, ['unknown', 'he'])
    ).toBe(false)
    expect(isResponseCompleted(interaction, realization, ['he', 'he'])).toBe(
      false
    )
    expect(isResponseCompleted(interaction, realization, ['he'])).toBe(false)
  })

  it('Selecting correctness uses the accepted canonical ChoiceRef set', () => {
    const { interaction, realization } = fixture(
      'Q1-InteractiveWebProfile',
      'select'
    )
    expect(isInteractionCorrect(interaction, realization, ['ne', 'he'])).toBe(
      true
    )
    expect(isInteractionCorrect(interaction, realization, ['he', 'o'])).toBe(
      false
    )
  })

  it('Ordering rejects missing/duplicate identities and compares canonical order', () => {
    const { interaction, realization } = fixture(
      'Q2-InteractiveWebProfile',
      'order'
    )
    expect(
      isInteractionCorrect(interaction, realization, [
        'prophase',
        'metaphase',
        'anaphase',
        'telophase',
      ])
    ).toBe(true)
    expect(
      isResponseCompleted(interaction, realization, [
        'prophase',
        'prophase',
        'anaphase',
        'telophase',
      ])
    ).toBe(false)
  })

  it('Relating validates source/target namespaces before correctness', () => {
    const { interaction, realization } = fixture(
      'Q3-InteractiveWebProfile',
      'rel'
    )
    const correct = [
      { sourceElementRef: 'france', targetElementRef: 'paris' },
      { sourceElementRef: 'italy', targetElementRef: 'rome' },
      { sourceElementRef: 'spain', targetElementRef: 'madrid' },
    ]
    expect(isInteractionCorrect(interaction, realization, correct)).toBe(true)
    expect(
      isResponseCompleted(interaction, realization, [
        { sourceElementRef: 'paris', targetElementRef: 'france' },
      ])
    ).toBe(false)
  })

  it('Completing requires every owning gap and enforces semantic usage limits', () => {
    const { interaction, realization } = fixture(
      'Q4-InteractiveWebProfile',
      'complete'
    )
    expect(
      isInteractionCorrect(interaction, realization, {
        'gap-1': 'co2',
        'gap-2': 'o2',
      })
    ).toBe(true)
    expect(
      isResponseCompleted(interaction, realization, { 'gap-1': 'co2' })
    ).toBe(false)
    expect(
      isResponseCompleted(interaction, realization, {
        'gap-1': 'co2',
        'gap-2': 'co2',
      })
    ).toBe(false)
  })

  it('Q5 accepts Integer 3 but rejects malformed or non-integer raw values', () => {
    const { interaction, realization } = fixture(
      'Q5-InteractiveWebProfile',
      'short'
    )
    expect(isInteractionCorrect(interaction, realization, '3')).toBe(true)
    expect(isResponseCompleted(interaction, realization, '3.0')).toBe(false)
    expect(isResponseCompleted(interaction, realization, 'not-a-number')).toBe(
      false
    )
  })

  it('distinguishes response absence from a legitimate empty Essay value', () => {
    const essay = fixture('Q12-InteractiveWebProfile-Required-realized', 'i3')
    expect(
      isResponseCompleted(essay.interaction, essay.realization, undefined)
    ).toBe(false)
    expect(isResponseCompleted(essay.interaction, essay.realization, '')).toBe(
      true
    )
  })

  it('does not add formal correctness for Essay, ArtifactSubmission, or Marking', () => {
    const essay = fixture('Q12-InteractiveWebProfile-Required-realized', 'i3')
    const artifact = fixture('Q7-InteractiveWebProfile', 'artifact')
    const marking = fixture('Q8A-InteractiveWebProfile', 'mark')
    expect(
      isInteractionCorrect(essay.interaction, essay.realization, 'text')
    ).toBe(false)
    expect(
      isInteractionCorrect(artifact.interaction, artifact.realization, [
        'concept-map',
      ])
    ).toBe(false)
    expect(
      isInteractionCorrect(marking.interaction, marking.realization, [{}])
    ).toBe(false)
  })

  it('keeps Marking completion behind a renderer-specific acceptance callback', () => {
    const { interaction, realization } = fixture(
      'Q8A-InteractiveWebProfile',
      'mark'
    )
    expect(isResponseCompleted(interaction, realization, [{}])).toBe(false)
    expect(
      isResponseCompleted(interaction, realization, [{}], {
        acceptMarking: (_marking, raw) =>
          Array.isArray(raw) && raw.length === 1,
      })
    ).toBe(true)
  })
})

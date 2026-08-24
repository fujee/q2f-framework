import { describe, expect, it } from 'vitest'
import {
  NormalizationError,
  normalizeArtifactSubmission,
  normalizeCompletion,
  normalizeDirectMarking,
  normalizeDirectOrdering,
  normalizeDirectRelationConstruction,
  normalizeExtendedTextEntry,
  normalizeListSelection,
  normalizeOrderNotation,
  normalizeRelationNotation,
  normalizeShortEntry,
  normalizeSpatialSelection,
} from './normalization'

describe('canonical response normalization', () => {
  it('ListSelection normalizes selected refs to a Set<ChoiceRef>, order-independent', () => {
    expect(normalizeListSelection(['ne', 'he'])).toEqual(new Set(['he', 'ne']))
  })

  it('SpatialSelection normalizes a resolved region mapping to a Set<ChoiceRef>', () => {
    expect(normalizeSpatialSelection(['circle'])).toEqual(new Set(['circle']))
  })

  it('DirectOrdering normalizes the final visual order to an OrderedList', () => {
    expect(
      normalizeDirectOrdering([
        'prophase',
        'metaphase',
        'anaphase',
        'telophase',
      ])
    ).toEqual(['prophase', 'metaphase', 'anaphase', 'telophase'])
  })

  it('OrderNotation normalizes rank notation to the same OrderedList as DirectOrdering', () => {
    const raw = { prophase: 1, metaphase: 2, anaphase: 3, telophase: 4 }
    expect(normalizeOrderNotation(raw)).toEqual([
      'prophase',
      'metaphase',
      'anaphase',
      'telophase',
    ])
  })

  it('DirectRelationConstruction normalizes constructed edges to a pair set', () => {
    const raw = [
      { sourceElementRef: 'france', targetElementRef: 'paris' },
      { sourceElementRef: 'italy', targetElementRef: 'rome' },
    ]
    expect(normalizeDirectRelationConstruction(raw)).toEqual(raw)
  })

  it('RelationNotation normalizes pair notation to the same relation set shape', () => {
    const raw = { france: 'paris', italy: 'rome' }
    expect(normalizeRelationNotation(raw)).toEqual([
      { sourceElementRef: 'france', targetElementRef: 'paris' },
      { sourceElementRef: 'italy', targetElementRef: 'rome' },
    ])
  })

  it('Completion normalizes per-gap values to a Map<GapRef, GapResponse>', () => {
    const raw = { 'gap-1': 'co2', 'gap-2': 'o2' }
    const result = normalizeCompletion(raw)
    expect(result.get('gap-1')).toBe('co2')
    expect(result.get('gap-2')).toBe('o2')
  })

  it('ShortEntry normalizes a string representation to a typed scalar', () => {
    expect(normalizeShortEntry('3', 'Number')).toBe(3)
    expect(normalizeShortEntry('Paris', 'Text')).toBe('Paris')
  })

  it('ExtendedTextEntry normalizes a text string to ExtendedText', () => {
    expect(normalizeExtendedTextEntry('The ball moves left to right.')).toBe(
      'The ball moves left to right.'
    )
  })

  it('DigitalArtifactSubmission and PhysicalArtifactSubmission normalize to Artifact[]', () => {
    expect(normalizeArtifactSubmission(['artifact-1'])).toEqual([
      { ref: 'artifact-1' },
    ])
    expect(normalizeArtifactSubmission([{ ref: 'artifact-2' }])).toEqual([
      { ref: 'artifact-2' },
    ])
  })

  it('DirectMarking normalizes a produced mark to Mark[]', () => {
    expect(normalizeDirectMarking([{ kind: 'Point', x: 0.4, y: 0.4 }])).toEqual(
      [{ kind: 'Point', x: 0.4, y: 0.4 }]
    )
  })

  it('malformed mechanism responses are rejected explicitly rather than guessed', () => {
    expect(() => normalizeListSelection('not-an-array')).toThrow(
      NormalizationError
    )
    expect(() => normalizeShortEntry('not-a-number', 'Number')).toThrow(
      NormalizationError
    )
    expect(() => normalizeDirectMarking([{ kind: 'Unknown' }])).toThrow(
      NormalizationError
    )
  })
})

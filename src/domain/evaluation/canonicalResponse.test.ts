import { describe, expect, it } from 'vitest'
import type {
  Completing,
  Essay,
  Relating,
  ResponseInteraction,
} from '../qd/model'
import { FROZEN_PRIMARY_CASES } from './frozenProtocolFixtures'
import {
  CanonicalResponseRejection,
  describeCanonicalNormalizationSupport,
  normalizeArtifactSubmissionResponse,
  normalizeCompletingResponse,
  normalizeEssayResponse,
  normalizeOrderingResponse,
  normalizeRelatingResponse,
  normalizeSelectingResponse,
  normalizeShortInputResponse,
} from './canonicalResponse'

function interaction<T extends ResponseInteraction['type']>(
  caseId: string,
  type: T
): Extract<ResponseInteraction, { type: T }> {
  const fixture = FROZEN_PRIMARY_CASES.find(({ id }) => id === caseId)
  const candidate = fixture?.qd.responseInteractions.find(
    (value): value is Extract<ResponseInteraction, { type: T }> =>
      value.type === type
  )
  if (!candidate) throw new Error(`Missing ${type} fixture for ${caseId}.`)
  return candidate
}

function rejectionCode(operation: () => unknown): string | undefined {
  try {
    operation()
  } catch (error) {
    if (error instanceof CanonicalResponseRejection) return error.code
    throw error
  }
  return undefined
}

describe('Frozen Evaluation Protocol v2 canonical-response acceptance', () => {
  it('Q1 Collapsed and Expanded orders normalize to the same ChoiceRef set', () => {
    const q1 = interaction('Q1-InteractiveWebProfile', 'Selecting')
    const collapsed = normalizeSelectingResponse(q1, {
      technique: 'Collapsed',
      selectedChoiceRefs: ['ne', 'he'],
    })
    const expanded = normalizeSelectingResponse(q1, {
      technique: 'Expanded',
      selectedChoiceRefs: ['he', 'ne'],
    })
    expect(collapsed).toEqual(new Set(['he', 'ne']))
    expect(expanded).toEqual(collapsed)
  })

  it('Q2 DirectOrdering and OrderNotation normalize to the same complete order', () => {
    const q2 = interaction('Q2-InteractiveWebProfile', 'Ordering')
    const expected = ['prophase', 'metaphase', 'anaphase', 'telophase']
    expect(
      normalizeOrderingResponse(q2, {
        technique: 'DirectOrdering',
        orderedItemRefs: expected,
      })
    ).toEqual(expected)
    expect(
      normalizeOrderingResponse(q2, {
        technique: 'OrderNotation',
        rankedItems: expected.map((itemRef, index) => ({
          itemRef,
          rank: index + 1,
        })),
      })
    ).toEqual(expected)
  })

  it('Q3 direct construction and notation preserve typed source/target pairs', () => {
    const q3 = interaction('Q3-InteractiveWebProfile', 'Relating')
    const pairs = [
      { sourceElementRef: 'france', targetElementRef: 'paris' },
      { sourceElementRef: 'italy', targetElementRef: 'rome' },
      { sourceElementRef: 'spain', targetElementRef: 'madrid' },
    ]
    const direct = normalizeRelatingResponse(q3, {
      technique: 'DirectRelationConstruction',
      pairs,
    })
    const notation = normalizeRelatingResponse(q3, {
      technique: 'RelationNotation',
      pairs: [
        { sourceElementRef: 'F', targetElementRef: 'P' },
        { sourceElementRef: 'I', targetElementRef: 'R' },
        { sourceElementRef: 'S', targetElementRef: 'M' },
      ],
      sourceMappings: [
        { rawRef: 'F', semanticRef: 'france' },
        { rawRef: 'I', semanticRef: 'italy' },
        { rawRef: 'S', semanticRef: 'spain' },
      ],
      targetMappings: [
        { rawRef: 'P', semanticRef: 'paris' },
        { rawRef: 'R', semanticRef: 'rome' },
        { rawRef: 'M', semanticRef: 'madrid' },
      ],
    })
    expect(notation).toEqual(direct)
  })

  it('keeps equal identifiers in separate Relating source and target namespaces', () => {
    const relating: Relating = {
      id: 'same-id-relating',
      type: 'Relating',
      mappingType: 'OneToOne',
      sourceParticipationPolicy: 'Required',
      sourceSet: {
        elementOrderPolicy: 'Fixed',
        relatingElements: [{ id: 'shared', semanticContent: 'Source' }],
      },
      targetSet: {
        elementOrderPolicy: 'Fixed',
        relatingElements: [{ id: 'shared', semanticContent: 'Target' }],
      },
      correctRelations: [
        { sourceElementRef: 'shared', targetElementRef: 'shared' },
      ],
    }
    expect(
      normalizeRelatingResponse(relating, {
        technique: 'DirectRelationConstruction',
        pairs: [{ sourceElementRef: 'shared', targetElementRef: 'shared' }],
      })
    ).toEqual(
      new Set([{ sourceElementRef: 'shared', targetElementRef: 'shared' }])
    )
  })

  it('Q4 DirectPlacement and ItemSelection normalize to the same semantic gap map', () => {
    const q4 = interaction('Q4-InteractiveWebProfile', 'Completing')
    const responses = [
      {
        gapRef: 'gap-1',
        response: { kind: 'ItemRef' as const, itemRef: 'co2' },
      },
      {
        gapRef: 'gap-2',
        response: { kind: 'ItemRef' as const, itemRef: 'o2' },
      },
    ]
    const direct = normalizeCompletingResponse(q4, {
      technique: 'DirectPlacement',
      responses,
    })
    const selected = normalizeCompletingResponse(q4, {
      technique: 'ItemSelection',
      responses: [...responses].reverse(),
    })
    expect(selected).toEqual(direct)
    expect(direct).toEqual(
      new Map([
        ['gap-1', { kind: 'ItemRef', itemRef: 'co2' }],
        ['gap-2', { kind: 'ItemRef', itemRef: 'o2' }],
      ])
    )
  })

  it('keeps InputGap scalar values distinct from ItemGap semantic assignments', () => {
    const completing: Completing = {
      id: 'mixed-completing',
      type: 'Completing',
      completingGaps: [
        {
          id: 'input-gap',
          type: 'InputGap',
          workspaceStimulusRef: 'workspace',
          placementSpecification: 'first',
          inputType: 'Integer',
          correctValues: [3],
        },
        {
          id: 'item-gap',
          type: 'ItemGap',
          workspaceStimulusRef: 'workspace',
          placementSpecification: 'second',
          correctItemRefs: ['three'],
        },
      ],
      completingItems: [{ id: 'three', semanticContent: 'three' }],
    }
    expect(
      normalizeCompletingResponse(completing, {
        technique: 'EmbeddedInput',
        responses: [
          { gapRef: 'input-gap', response: { kind: 'Scalar', value: '3' } },
          {
            gapRef: 'item-gap',
            response: { kind: 'ItemRef', itemRef: 'three' },
          },
        ],
      })
    ).toEqual(
      new Map([
        ['input-gap', { kind: 'InputValue', value: 3 }],
        ['item-gap', { kind: 'ItemRef', itemRef: 'three' }],
      ])
    )
  })

  it('Q5 produces Integer 3 instead of a comparison-friendly string', () => {
    const q5 = interaction('Q5-InteractiveWebProfile', 'ShortInput')
    const normalized = normalizeShortInputResponse(q5, '3')
    expect(normalized).toBe(3)
    expect(typeof normalized).toBe('number')
  })

  it('Essay normalization preserves text without scoring its quality', () => {
    const essay: Essay = { id: 'essay', type: 'Essay' }
    expect(normalizeEssayResponse(essay, 'A concise response.')).toBe(
      'A concise response.'
    )
  })

  it('Q7 digital and physical channels normalize to the same unordered Artifact[]', () => {
    const q7 = interaction('Q7-InteractiveWebProfile', 'ArtifactSubmission')
    const digital = normalizeArtifactSubmissionResponse(q7, {
      channel: 'DigitalSubmission',
      artifactRefs: ['concept-map'],
    })
    const physical = normalizeArtifactSubmissionResponse(q7, {
      channel: 'PhysicalSubmission',
      artifactRefs: ['concept-map'],
    })
    expect(physical).toEqual(digital)
    expect(digital).toEqual([{ artifactRef: 'concept-map' }])
  })

  it('Q9 direct and mapped referenced selection preserve the same ChoiceRef', () => {
    const q9 = interaction('Q9-InteractiveWebProfile', 'Selecting')
    const direct = normalizeSelectingResponse(q9, {
      technique: 'DirectSelection',
      selectedChoiceRefs: ['circle'],
    })
    const referenced = normalizeSelectingResponse(q9, {
      technique: 'ReferencedSelection',
      selectedRawRefs: ['B'],
      mappings: [{ rawRef: 'B', semanticRef: 'circle' }],
    })
    expect(referenced).toEqual(direct)
  })

  it('does not claim generic Marking normalization beyond the frozen contract', () => {
    const q8a = interaction('Q8A-InteractiveWebProfile', 'Marking')
    expect(describeCanonicalNormalizationSupport(q8a)).toEqual({
      status: 'RENDERER_SPECIFIC',
      reason: expect.stringContaining('no universal raw mark payload'),
    })
  })
})

describe('canonical-response explicit rejection', () => {
  it('rejects unknown and duplicate Selecting semantic references', () => {
    const q1 = interaction('Q1-InteractiveWebProfile', 'Selecting')
    expect(
      rejectionCode(() =>
        normalizeSelectingResponse(q1, {
          technique: 'Collapsed',
          selectedChoiceRefs: ['he', 'unknown'],
        })
      )
    ).toBe('UNKNOWN_REFERENCE')
    expect(
      rejectionCode(() =>
        normalizeSelectingResponse(q1, {
          technique: 'Collapsed',
          selectedChoiceRefs: ['he', 'he'],
        })
      )
    ).toBe('DUPLICATE_REFERENCE')
  })

  it('rejects ambiguous referenced mappings instead of choosing one', () => {
    const q9 = interaction('Q9-InteractiveWebProfile', 'Selecting')
    expect(
      rejectionCode(() =>
        normalizeSelectingResponse(q9, {
          technique: 'ReferencedSelection',
          selectedRawRefs: ['B'],
          mappings: [
            { rawRef: 'B', semanticRef: 'circle' },
            { rawRef: 'B', semanticRef: 'triangle' },
          ],
        })
      )
    ).toBe('AMBIGUOUS_REFERENCE')
  })

  it('rejects duplicate or missing Ordering identities', () => {
    const q2 = interaction('Q2-InteractiveWebProfile', 'Ordering')
    expect(
      rejectionCode(() =>
        normalizeOrderingResponse(q2, {
          technique: 'DirectOrdering',
          orderedItemRefs: ['prophase', 'prophase', 'anaphase', 'telophase'],
        })
      )
    ).toBe('DUPLICATE_REFERENCE')
    expect(
      rejectionCode(() =>
        normalizeOrderingResponse(q2, {
          technique: 'DirectOrdering',
          orderedItemRefs: ['prophase', 'metaphase', 'anaphase'],
        })
      )
    ).toBe('INCOMPLETE_RESPONSE')
  })

  it('rejects invalid Relating source and target namespace identities', () => {
    const q3 = interaction('Q3-InteractiveWebProfile', 'Relating')
    expect(
      rejectionCode(() =>
        normalizeRelatingResponse(q3, {
          technique: 'DirectRelationConstruction',
          pairs: [{ sourceElementRef: 'paris', targetElementRef: 'france' }],
        })
      )
    ).toBe('UNKNOWN_REFERENCE')
  })

  it('rejects a gap outside the owning Completing interaction', () => {
    const q4 = interaction('Q4-InteractiveWebProfile', 'Completing')
    expect(
      rejectionCode(() =>
        normalizeCompletingResponse(q4, {
          technique: 'DirectPlacement',
          responses: [
            {
              gapRef: 'other-gap',
              response: { kind: 'ItemRef', itemRef: 'co2' },
            },
            { gapRef: 'gap-2', response: { kind: 'ItemRef', itemRef: 'o2' } },
          ],
        })
      )
    ).toBe('UNKNOWN_REFERENCE')
  })

  it('rejects a raw Completing response that would require guessing gap semantics', () => {
    const q4 = interaction('Q4-InteractiveWebProfile', 'Completing')
    expect(
      rejectionCode(() =>
        normalizeCompletingResponse(q4, {
          technique: 'ItemSelection',
          responses: [
            { gapRef: 'gap-1', response: { kind: 'Scalar', value: 'co2' } },
            { gapRef: 'gap-2', response: { kind: 'ItemRef', itemRef: 'o2' } },
          ],
        })
      )
    ).toBe('TYPE_MISMATCH')
  })

  it('enforces QD usageLimit over semantic assignments', () => {
    const q4 = interaction('Q4-InteractiveWebProfile', 'Completing')
    expect(
      rejectionCode(() =>
        normalizeCompletingResponse(q4, {
          technique: 'DirectPlacement',
          responses: [
            { gapRef: 'gap-1', response: { kind: 'ItemRef', itemRef: 'co2' } },
            { gapRef: 'gap-2', response: { kind: 'ItemRef', itemRef: 'co2' } },
          ],
        })
      )
    ).toBe('USAGE_LIMIT_EXCEEDED')
  })

  it('rejects malformed Integer and Number values without coercive guessing', () => {
    const q5 = interaction('Q5-InteractiveWebProfile', 'ShortInput')
    expect(rejectionCode(() => normalizeShortInputResponse(q5, '3.0'))).toBe(
      'TYPE_MISMATCH'
    )
    const numberInteraction = interaction(
      'Q11-InteractiveWebProfile',
      'ShortInput'
    )
    expect(
      rejectionCode(() => normalizeShortInputResponse(numberInteraction, '60x'))
    ).toBe('TYPE_MISMATCH')
  })
})

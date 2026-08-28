import { describe, expect, it } from 'vitest'
import {
  computePreviewBlockers,
  computeQfdFeasibilityStatus,
  computeQfdValidationStatus,
} from './qfdStatus'
import * as fx from '@/domain/qfd/fixtures/qfdFixtures'
import type { QuestionDefinition } from '@/domain/qd/model'
import type { QuestionFormDefinition } from '@/domain/qfd/model'

describe('computePreviewBlockers', () => {
  it('blocks paper preview for an Audio stimulus', () => {
    const blockers = computePreviewBlockers(fx.q5Qd, fx.q5QfdPaper)
    expect(blockers.some((f) => f.ruleId === 'PROF-STM-001')).toBe(true)
    expect(blockers.every((f) => f.status === 'FAIL')).toBe(true)
  })

  it('blocks paper preview for a Video stimulus', () => {
    const blockers = computePreviewBlockers(fx.q6Qd, fx.q6QfdPaper)
    expect(blockers.some((f) => f.ruleId === 'PROF-STM-001')).toBe(true)
  })

  it('does not block web preview for Audio/Video (InteractiveWebProfile supports them)', () => {
    expect(computePreviewBlockers(fx.q5Qd, fx.q5QfdWeb)).toEqual([])
    expect(computePreviewBlockers(fx.q6Qd, fx.q6QfdWeb)).toEqual([])
  })

  it('does not block a valid, supported paper form', () => {
    expect(computePreviewBlockers(fx.q1Qd, fx.q1QfdPaper)).toEqual([])
  })

  it('blocks on unsupported mechanisms, not just modalities', () => {
    const blockers = computePreviewBlockers(
      fx.q2Qd,
      fx.q2QfdPaperInvalidMechanism
    )
    expect(blockers.some((f) => f.ruleId === 'PROF-INT-001')).toBe(true)
  })

  it('does not block on non-blocking (WARNING) feasibility findings', () => {
    const qd: QuestionDefinition = {
      id: 'qd-pref-dep',
      status: 'Draft',
      categories: [],
      responseInteractions: [
        {
          id: 'a',
          code: 'A',
          type: 'ShortInput',
          inputType: 'Number',
          correctValues: [1],
        },
        { id: 'b', code: 'B', type: 'Essay' },
      ],
      stimuli: [],
      interactionStimulusAssociations: [],
      constraints: [
        {
          id: 'd1',
          type: 'Dependency',
          strength: 'Preferred',
          predecessorInteractionRef: 'a',
          successorInteractionRef: 'b',
          rule: 'RequiresCompletion',
        },
      ],
    }
    const qfd: QuestionFormDefinition = {
      id: 'qfd-pref-dep',
      questionDefinitionRef: 'qd-pref-dep',
      targetProfileRef: 'ConventionalPaperProfile',
      interactionRealizations: [
        { id: 'ir-a', interactionRef: 'a', mechanism: 'ShortEntry' },
        { id: 'ir-b', interactionRef: 'b', mechanism: 'ExtendedTextEntry' },
      ],
      stimulusRealizations: [],
      rootLayout: {
        kind: 'Stack',
        direction: 'Vertical',
        children: [
          { kind: 'InteractionBlock', interactionRealizationRef: 'ir-a' },
          { kind: 'InteractionBlock', interactionRealizationRef: 'ir-b' },
        ],
      },
    }
    expect(computePreviewBlockers(qd, qfd)).toEqual([])
  })
})

describe('computeQfdValidationStatus', () => {
  it('is PASS for a valid QFD', () => {
    expect(computeQfdValidationStatus(fx.q1Qd, fx.q1QfdWeb)).toBe('PASS')
  })

  it('is FAIL for an invalid QFD', () => {
    expect(computeQfdValidationStatus(fx.q1Qd, fx.q1QfdInvalidRootLayout)).toBe(
      'FAIL'
    )
  })
})

describe('computeQfdFeasibilityStatus', () => {
  it('is FEASIBLE for a supported web form', () => {
    expect(computeQfdFeasibilityStatus(fx.q1Qd, fx.q1QfdWeb)).toBe('FEASIBLE')
  })

  it('is INFEASIBLE for an unsupported mechanism on paper', () => {
    expect(
      computeQfdFeasibilityStatus(fx.q2Qd, fx.q2QfdPaperInvalidMechanism)
    ).toBe('INFEASIBLE')
  })
})

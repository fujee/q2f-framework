import { describe, expect, it } from 'vitest'
import {
  checkPotentialRealization,
  generateQfdSkeleton,
} from './generateQfdSkeleton'
import {
  INTERACTIVE_WEB_PROFILE,
  CONVENTIONAL_PAPER_PROFILE,
} from '../profiles/registry'
import { validateQFD } from '../validation/validateQFD'
import * as fx from '../fixtures/qfdFixtures'

describe('QD -> QFD skeleton generation', () => {
  it('auto-fills unambiguous mechanisms (ShortInput has exactly one baseline mechanism)', () => {
    const skeleton = generateQfdSkeleton(fx.q5Qd, 'InteractiveWebProfile')
    expect(skeleton.interactionRealizations).toHaveLength(1)
    expect(skeleton.interactionRealizations[0].mechanism).toBe('ShortEntry')
  })

  it('does not choose a mechanism for Selecting (ListSelection vs SpatialSelection) and reports an obligation', () => {
    const skeleton = generateQfdSkeleton(fx.q1Qd, 'InteractiveWebProfile')
    expect(skeleton.interactionRealizations).toHaveLength(0)
    const obligation = skeleton.obligations.find(
      (o) => o.kind === 'MechanismChoice'
    )
    expect(obligation).toBeDefined()
    expect(obligation?.options).toEqual(
      expect.arrayContaining(['ListSelection', 'SpatialSelection'])
    )
  })

  it('auto-fills a Fixed stimulus as ReuseSource without inventing content', () => {
    const skeleton = generateQfdSkeleton(fx.q3Qd, 'InteractiveWebProfile')
    expect(skeleton.stimulusRealizations).toHaveLength(1)
    expect(skeleton.stimulusRealizations[0].mode).toBe('ReuseSource')
    expect(skeleton.stimulusRealizations[0].realizedContent).toBeUndefined()
  })

  it('flags a SpecificationBased stimulus with a content obligation rather than inventing realizedContent', () => {
    const skeleton = generateQfdSkeleton(fx.q10Qd, 'InteractiveWebProfile')
    const sr = skeleton.stimulusRealizations.find(
      (r) => r.stimulusRef === 'q10-heart-spec'
    )
    expect(sr?.mode).toBe('MaterializeFromSpecification')
    expect(sr?.realizedContent).toBeUndefined()
    expect(
      skeleton.obligations.some(
        (o) =>
          o.kind === 'StimulusContentRequired' &&
          o.stimulusRef === 'q10-heart-spec'
      )
    ).toBe(true)
  })

  it('flags an Adaptable stimulus mode choice as an obligation rather than guessing', () => {
    const skeleton = generateQfdSkeleton(fx.q11Qd, 'InteractiveWebProfile')
    expect(skeleton.stimulusRealizations).toHaveLength(0)
    expect(
      skeleton.obligations.some(
        (o) =>
          o.kind === 'StimulusRealizationDecision' &&
          o.stimulusRef === 'q11-chart'
      )
    ).toBe(true)
  })

  it('flags Workspace associations as integration obligations rather than designing layout', () => {
    const skeleton = generateQfdSkeleton(fx.q8aQd, 'InteractiveWebProfile')
    expect(
      skeleton.obligations.some(
        (o) =>
          o.kind === 'WorkspaceIntegration' && o.interactionRef === 'q8a-mark'
      )
    ).toBe(true)
  })

  it('flags required sequence/dependency constraints as order obligations', () => {
    const skeleton = generateQfdSkeleton(fx.q12Qd, 'InteractiveWebProfile')
    expect(
      skeleton.obligations.filter((o) => o.kind === 'OrderDependency').length
    ).toBeGreaterThanOrEqual(2)
  })

  it('an unambiguous skeleton with no obligations passes validateQFD', () => {
    const skeleton = generateQfdSkeleton(fx.q5Qd, 'InteractiveWebProfile')
    expect(skeleton.obligations).toHaveLength(0)
    const qfd = {
      id: 'qfd-skeleton-q5',
      questionDefinitionRef: skeleton.questionDefinitionRef,
      targetProfileRef: skeleton.targetProfileRef,
      interactionRealizations: skeleton.interactionRealizations,
      stimulusRealizations: skeleton.stimulusRealizations,
      rootLayout: skeleton.rootLayout,
    }
    expect(validateQFD(qfd, fx.q5Qd).aggregate).toBe('PASS')
  })

  it('checkPotentialRealization flags Video stimuli as unsupported on the paper profile without using feasibility labels', () => {
    const check = checkPotentialRealization(fx.q6Qd, CONVENTIONAL_PAPER_PROFILE)
    expect(check.potentiallyRealizable).toBe(false)
    expect(check.unsupportedStimulusIds).toContain('q6-video')
  })

  it('checkPotentialRealization is true for Q1 on both profiles', () => {
    expect(
      checkPotentialRealization(fx.q1Qd, INTERACTIVE_WEB_PROFILE)
        .potentiallyRealizable
    ).toBe(true)
    expect(
      checkPotentialRealization(fx.q1Qd, CONVENTIONAL_PAPER_PROFILE)
        .potentiallyRealizable
    ).toBe(true)
  })
})

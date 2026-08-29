import { describe, expect, it } from 'vitest'
import type { DependencyConstraint, QuestionDefinition } from '../../qd/model'
import {
  CONVENTIONAL_PAPER_PROFILE,
  FROZEN_PRIMARY_CASES,
  INTERACTIVE_WEB_PROFILE,
} from '../../evaluation/frozenProtocolFixtures'
import * as transformation from './generateQfdSkeleton'

function qd(caseId: string): QuestionDefinition {
  const fixture = FROZEN_PRIMARY_CASES.find(({ id }) => id === caseId)
  if (!fixture) throw new Error(`Missing frozen fixture '${caseId}'.`)
  return structuredClone(fixture.qd)
}

function obligation(
  skeleton: transformation.QfdSkeleton,
  kind: transformation.TransformationObligationKind,
  ref?: string
): transformation.TransformationObligation | undefined {
  return skeleton.obligations.find(
    (candidate) =>
      candidate.kind === kind &&
      (ref === undefined ||
        candidate.interactionRef === ref ||
        candidate.stimulusRef === ref ||
        candidate.elementRef === ref)
  )
}

describe('stabilized QD/profile -> QFD authoring skeleton', () => {
  it('returns an implementation draft rather than pretending to be a final QFD', () => {
    const skeleton = transformation.generateQfdSkeleton(
      qd('Q5-InteractiveWebProfile'),
      INTERACTIVE_WEB_PROFILE
    )
    expect(skeleton.kind).toBe('QfdSkeleton')
    expect(skeleton).not.toHaveProperty('rootLayout')
    expect(skeleton).not.toHaveProperty('interactionRealizations')
    expect(obligation(skeleton, 'LayoutRequired')).toBeDefined()
  })

  it('does not arbitrarily choose when one QD/profile permits multiple stable QFD options', () => {
    const skeleton = transformation.generateQfdSkeleton(
      qd('Q1-InteractiveWebProfile'),
      INTERACTIVE_WEB_PROFILE
    )
    const plan = skeleton.interactionPlans[0]
    expect(plan.candidateOptions.map(({ id }) => id)).toEqual([
      'SelectingRealization+Expanded',
      'SelectingRealization+Collapsed',
    ])
    expect(plan.selectedOptionId).toBeUndefined()
    expect(
      obligation(skeleton, 'InteractionRealizationDecision', 'select')?.options
    ).toEqual(plan.candidateOptions.map(({ id }) => id))
  })

  it('plans all eight stabilized interaction families from typed QFD capabilities', () => {
    const cases = [
      ['Q1-InteractiveWebProfile', 'Selecting'],
      ['Q2-InteractiveWebProfile', 'Ordering'],
      ['Q3-InteractiveWebProfile', 'Relating'],
      ['Q4-InteractiveWebProfile', 'Completing'],
      ['Q5-InteractiveWebProfile', 'ShortInput'],
      ['Q6-InteractiveWebProfile', 'Essay'],
      ['Q7-InteractiveWebProfile', 'ArtifactSubmission'],
      ['Q8A-InteractiveWebProfile', 'Marking'],
    ] as const
    for (const [caseId, interactionType] of cases) {
      const skeleton = transformation.generateQfdSkeleton(
        qd(caseId),
        INTERACTIVE_WEB_PROFILE
      )
      const plan = skeleton.interactionPlans.find(
        (candidate) => candidate.interactionType === interactionType
      )
      expect(plan, `${caseId} ${interactionType}`).toBeDefined()
      expect(
        plan?.candidateOptions.length,
        `${caseId} ${interactionType}`
      ).toBeGreaterThan(0)
    }
  })

  it('maps Fixed, Adaptable, and SpecificationBased policies without inventing content', () => {
    const fixed = transformation.generateQfdSkeleton(
      qd('Q3-InteractiveWebProfile'),
      INTERACTIVE_WEB_PROFILE
    )
    expect(fixed.stimulusPlans[0]).toMatchObject({
      selectedMode: 'PreserveContent',
      realizedContentRequired: false,
    })
    expect(
      obligation(fixed, 'StimulusRealizationDecision', 'q3-text')?.options
    ).toEqual(['UseSourceCarrierIfDirectlyUsable', 'ProvideRealizedContent'])

    const adaptable = transformation.generateQfdSkeleton(
      qd('Q11-InteractiveWebProfile'),
      INTERACTIVE_WEB_PROFILE
    )
    expect(adaptable.stimulusPlans[0].selectedMode).toBeUndefined()
    expect(adaptable.stimulusPlans[0].modeCandidates).toEqual([
      'PreserveContent',
      'AdaptContent',
    ])

    const specificationBased = transformation.generateQfdSkeleton(
      qd('Q10-InteractiveWebProfile'),
      INTERACTIVE_WEB_PROFILE
    )
    expect(specificationBased.stimulusPlans[0]).toMatchObject({
      selectedMode: 'MaterializeFromSpecification',
      realizedContentRequired: true,
    })
    expect(
      obligation(specificationBased, 'RealizedContentRequired', 'q10-spec')
    ).toBeDefined()
  })

  it('reuses a QD instruction implicitly and never authors realizedText', () => {
    const skeleton = transformation.generateQfdSkeleton(
      qd('Q5-InteractiveWebProfile'),
      INTERACTIVE_WEB_PROFILE
    )
    expect(skeleton.interactionPlans[0].instructionPlan).toEqual({
      taskInstruction: 'ReuseQdInstruction',
    })
    expect(JSON.stringify(skeleton)).not.toContain('realizedText')
  })

  it('derives logical precedence from Sequence independently of layout', () => {
    const skeleton = transformation.generateQfdSkeleton(
      qd('Q6-InteractiveWebProfile'),
      INTERACTIVE_WEB_PROFILE
    )
    expect(skeleton.interactionPrecedenceRequirements).toEqual([
      { beforeInteractionRef: 'short', afterInteractionRef: 'essay' },
    ])
  })

  it('does not turn Dependency into Sequence or interaction precedence', () => {
    const skeleton = transformation.generateQfdSkeleton(
      qd('Q12-InteractiveWebProfile-Required-realized'),
      INTERACTIVE_WEB_PROFILE
    )
    expect(skeleton.interactionPrecedenceRequirements).toEqual([
      { beforeInteractionRef: 'i2', afterInteractionRef: 'i3' },
    ])
    expect(skeleton.interactionPrecedenceRequirements).not.toContainEqual({
      beforeInteractionRef: 'i1',
      afterInteractionRef: 'i2',
    })
    expect(skeleton.dependencyPlans[0].realization).toEqual({
      predecessorInteractionRef: 'i1',
      successorInteractionRef: 'i2',
      rule: 'RequiresCorrectness',
      exposurePolicy: 'ConcealedUntilSatisfied',
    })
  })

  it('retains a Required dependency plan when the target profile is too weak', () => {
    const skeleton = transformation.generateQfdSkeleton(
      qd('Q12-ConventionalPaperProfile-Required-realized'),
      CONVENTIONAL_PAPER_PROFILE
    )
    expect(skeleton.dependencyPlans[0]).toMatchObject({
      inclusion: 'Required',
      missingCapabilities: ['CorrectnessGating', 'ConditionalConcealment'],
    })
    expect(
      obligation(skeleton, 'NoFeasibleRealizationCandidate', 'i2')
        ?.missingCapabilities
    ).toEqual(['CorrectnessGating', 'ConditionalConcealment'])
  })

  it('keeps a Preferred dependency optional and complete in rule plus exposure semantics', () => {
    const preferredQd = qd('Q12-InteractiveWebProfile-Required-realized')
    const dependency = preferredQd.constraints.find(
      (constraint): constraint is DependencyConstraint =>
        constraint.type === 'Dependency'
    )
    if (!dependency) throw new Error('Missing Q12 dependency.')
    dependency.strength = 'Preferred'
    const skeleton = transformation.generateQfdSkeleton(
      preferredQd,
      INTERACTIVE_WEB_PROFILE
    )
    expect(skeleton.dependencyPlans[0]).toMatchObject({
      inclusion: 'Optional',
      realization: {
        rule: 'RequiresCorrectness',
        exposurePolicy: 'ConcealedUntilSatisfied',
      },
    })
    expect(
      obligation(skeleton, 'DependencyRealizationDecision', 'i2')?.options
    ).toEqual(['OmitWithConformanceWarning', 'RealizeCompleteDependency'])
  })

  it('reports Workspace and location obligations without an anchor payload', () => {
    const skeleton = transformation.generateQfdSkeleton(
      qd('Q9-InteractiveWebProfile'),
      INTERACTIVE_WEB_PROFILE
    )
    expect(
      obligation(skeleton, 'WorkspaceRealizationDecision', 'select')
    ).toBeDefined()
    for (const choiceRef of ['triangle', 'circle', 'square']) {
      expect(
        obligation(skeleton, 'RealizationAnchorRequired', choiceRef)?.options
      ).toEqual(['ProvideConcreteRealizationAnchor'])
    }
    expect(
      skeleton.obligations.every((candidate) => !('payload' in candidate))
    ).toBe(true)
  })

  it('does not expose removed model shapes in the skeleton output', () => {
    const skeleton = transformation.generateQfdSkeleton(
      qd('Q10-InteractiveWebProfile'),
      INTERACTIVE_WEB_PROFILE
    )
    const serialized = JSON.stringify(skeleton)
    for (const removed of [
      'supportedResponse' + 'Mechanisms',
      'interactionStimulus' + 'Associations',
      'Stimulus' + 'Block',
      'Interaction' + 'Block',
      'Reuse' + 'Source',
      'Adapt' + 'Source',
    ]) {
      expect(serialized).not.toContain(removed)
    }
  })

  it('removes the parallel potential-realization helper instead of duplicating feasibility', () => {
    expect(transformation).not.toHaveProperty('checkPotential' + 'Realization')
  })

  it('reports no supported candidate rather than weakening an interaction requirement', () => {
    const q8 = qd('Q8A-InteractiveWebProfile')
    const weakProfile = {
      id: 'WeakProfile',
      supportedStimulusModalities: ['Image' as const],
      capabilities: ['VerticalComposition' as const],
    }
    const skeleton = transformation.generateQfdSkeleton(q8, weakProfile)
    const markingPlan = skeleton.interactionPlans.find(
      ({ interactionType }) => interactionType === 'Marking'
    )
    expect(markingPlan?.candidateOptions).toEqual([])
    expect(markingPlan?.unavailableOptions[0].missingCapabilities).toEqual([
      'PointMarking',
      'TextualPresentation',
    ])
  })
})

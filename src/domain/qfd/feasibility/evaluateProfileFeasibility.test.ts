import { describe, expect, it } from 'vitest'
import type { DependencyConstraint } from '../../qd/model'
import {
  buildValidQfd,
  qfdTestProfile,
  qfdTestQd,
} from '../fixtures/qfdFixtures'
import { INTERACTIVE_WEB_PROFILE_RECORD } from '../profiles/registry'
import type { QuestionFormProfile } from '../profiles/model'
import { evaluateProfileFeasibility } from './evaluateProfileFeasibility'

function profileWithout(...capabilities: typeof qfdTestProfile.capabilities) {
  return {
    ...structuredClone(qfdTestProfile),
    capabilities: qfdTestProfile.capabilities.filter(
      (capability) => !capabilities.includes(capability)
    ),
  }
}

function dependency(strength: DependencyConstraint['strength']) {
  return {
    type: 'Dependency' as const,
    predecessorInteractionRef: 'selecting',
    successorInteractionRef: 'essay',
    rule: 'RequiresCorrectness' as const,
    exposurePolicy: 'ConcealedUntilSatisfied' as const,
    strength,
  }
}

describe('profile feasibility on the stabilized QFD/profile model', () => {
  it('accepts the complete focused profile', () => {
    expect(
      evaluateProfileFeasibility(qfdTestQd, buildValidQfd(), qfdTestProfile)
        .aggregate
    ).toBe('FEASIBLE')
  })

  it('rejects an unsupported concrete QFD capability', () => {
    const result = evaluateProfileFeasibility(
      qfdTestQd,
      buildValidQfd(),
      profileWithout('ExpandedSelection')
    )
    expect(result.aggregate).toBe('INFEASIBLE')
  })

  it('rejects an unsupported concrete StimulusRealization modality', () => {
    const profile = {
      ...structuredClone(qfdTestProfile),
      supportedStimulusModalities: ['Text' as const],
    }
    expect(
      evaluateProfileFeasibility(qfdTestQd, buildValidQfd(), profile).aggregate
    ).toBe('INFEASIBLE')
  })

  it('rejects an unsupported Required dependency capability even when omitted by QFD', () => {
    const qd = structuredClone(qfdTestQd)
    qd.constraints = [dependency('Required')]
    const qfd = buildValidQfd()
    qfd.dependencyRealizations = []
    expect(
      evaluateProfileFeasibility(qd, qfd, profileWithout('CorrectnessGating'))
        .aggregate
    ).toBe('INFEASIBLE')
  })

  it('warns for an unsupported omitted Preferred dependency', () => {
    const qd = structuredClone(qfdTestQd)
    qd.constraints = [dependency('Preferred')]
    const qfd = buildValidQfd()
    qfd.dependencyRealizations = []
    expect(
      evaluateProfileFeasibility(
        qd,
        qfd,
        profileWithout('CorrectnessGating', 'ConditionalConcealment')
      ).aggregate
    ).toBe('FEASIBLE_WITH_WARNINGS')
  })

  it('rejects a realized Preferred dependency with unsupported capability', () => {
    const qd = structuredClone(qfdTestQd)
    qd.constraints = [dependency('Preferred')]
    expect(
      evaluateProfileFeasibility(
        qd,
        buildValidQfd(),
        profileWithout('CorrectnessGating')
      ).aggregate
    ).toBe('INFEASIBLE')
  })

  it('lets Required dominate an identical Preferred dependency', () => {
    const qd = structuredClone(qfdTestQd)
    qd.constraints = [dependency('Preferred'), dependency('Required')]
    const qfd = buildValidQfd()
    qfd.dependencyRealizations = []
    const result = evaluateProfileFeasibility(
      qd,
      qfd,
      profileWithout('CorrectnessGating')
    )
    expect(result.aggregate).toBe('INFEASIBLE')
    expect(result.findings.some(({ status }) => status === 'WARNING')).toBe(
      false
    )
  })

  it('does not derive capabilities from mediumFamily metadata', () => {
    const record = structuredClone(INTERACTIVE_WEB_PROFILE_RECORD)
    record.metadata = { mediumFamily: 'InteractiveWeb' }
    record.profile.capabilities = []
    expect(
      evaluateProfileFeasibility(qfdTestQd, buildValidQfd(), record.profile)
        .aggregate
    ).toBe('INFEASIBLE')
  })
})

describe('mandatory QD capability derivation', () => {
  it('accepts a QD Sequence with concrete precedence on a supporting profile', () => {
    const qd = structuredClone(qfdTestQd)
    qd.constraints = [
      { type: 'Sequence', interactionRefs: ['selecting', 'ordering'] },
    ]
    expect(
      evaluateProfileFeasibility(qd, buildValidQfd(), qfdTestProfile).aggregate
    ).toBe('FEASIBLE')
  })

  it('rejects an unsupported QD Sequence even when QFD omits precedence', () => {
    const qd = structuredClone(qfdTestQd)
    qd.constraints = [
      { type: 'Sequence', interactionRefs: ['selecting', 'ordering'] },
    ]
    const qfd = buildValidQfd()
    qfd.interactionPrecedences = []
    expect(
      evaluateProfileFeasibility(
        qd,
        qfd,
        profileWithout('LogicalInteractionPrecedence')
      ).aggregate
    ).toBe('INFEASIBLE')
  })

  it('allows QD Sequence feasibility when profile supports precedence despite QFD omission', () => {
    const qd = structuredClone(qfdTestQd)
    qd.constraints = [
      { type: 'Sequence', interactionRefs: ['selecting', 'ordering'] },
    ]
    const qfd = buildValidQfd()
    qfd.interactionPrecedences = []
    expect(evaluateProfileFeasibility(qd, qfd, qfdTestProfile).aggregate).toBe(
      'FEASIBLE'
    )
  })

  it('does not require precedence capability without QD Sequence or QFD precedence', () => {
    const qfd = buildValidQfd()
    qfd.interactionPrecedences = []
    expect(
      evaluateProfileFeasibility(
        qfdTestQd,
        qfd,
        profileWithout('LogicalInteractionPrecedence')
      ).aggregate
    ).toBe('FEASIBLE')
  })

  it('rejects unsupported concrete QFD precedence without a QD Sequence', () => {
    expect(
      evaluateProfileFeasibility(
        qfdTestQd,
        buildValidQfd(),
        profileWithout('LogicalInteractionPrecedence')
      ).aggregate
    ).toBe('INFEASIBLE')
  })

  it('requires TextualPresentation for a QD instruction omitted by QFD', () => {
    const qd = {
      id: 'qd-instruction',
      responseInteractions: [
        {
          id: 'short',
          type: 'ShortInput' as const,
          instruction: 'Enter the result.',
          inputType: 'Integer' as const,
          correctValues: [2],
        },
      ],
      stimuli: [],
      associations: [],
      constraints: [],
    }
    const qfd = {
      questionDefinitionRef: qd.id,
      targetProfileRef: 'profile-instruction',
      stimulusRealizations: [],
      interactionRealizations: [
        {
          type: 'ShortInputRealization' as const,
          interactionRef: 'short',
          instructionRealizations: [],
          responseSite: { id: 'short-site' },
        },
      ],
      interactionPrecedences: [],
      dependencyRealizations: [],
      rootLayout: {
        kind: 'LayoutGroup' as const,
        orientation: 'Vertical' as const,
        children: [
          {
            kind: 'LayoutPlacement' as const,
            realizationRef: {
              kind: 'ResponseSiteRealization' as const,
              id: 'short-site',
            },
          },
        ],
      },
    }
    const profile: QuestionFormProfile = {
      id: 'profile-instruction',
      supportedStimulusModalities: [],
      capabilities: ['ScalarResponse', 'VerticalComposition'],
    }
    expect(evaluateProfileFeasibility(qd, qfd, profile).aggregate).toBe(
      'INFEASIBLE'
    )
  })
})

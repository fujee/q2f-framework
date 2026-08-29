import { describe, expect, it } from 'vitest'
import type { DependencyConstraint, QuestionDefinition } from '../../qd/model'
import { buildValidQfd, qfdTestQd } from '../fixtures/qfdFixtures'
import type { QuestionFormDefinition } from '../model'
import type { ConformanceEvidence } from './evidence'
import { workspaceBindingKey } from './evidence'
import { evaluateConformance } from './evaluateConformance'

function fixture(): {
  qd: QuestionDefinition
  qfd: QuestionFormDefinition
  evidence: ConformanceEvidence
} {
  const qd = structuredClone(qfdTestQd)
  const selecting = qd.responseInteractions.find(
    ({ id }) => id === 'selecting'
  )!
  selecting.instruction = 'Select every applicable option.'

  const qfd = buildValidQfd({ itemResponsePlacement: 'Embedded' })
  const selectingRealization = qfd.interactionRealizations.find(
    (realization) => realization.type === 'SelectingRealization'
  )!
  selectingRealization.instructionRealizations = [
    selectingRealization.instructionRealizations[0],
  ]
  selectingRealization.workspaceRealizations.forEach((workspace) =>
    workspace.choiceRealizations.forEach((choice) => {
      delete choice.realizationAnchor
    })
  )
  qfd.dependencyRealizations = []
  qfd.interactionPrecedences = []
  return {
    qd,
    qfd,
    evidence: {
      directSourceReuseStimulusRealizationIds: new Set([
        'sr-select',
        'sr-complete',
        'sr-mark',
      ]),
      trustedArtifactInteractionRefs: new Set(['artifact']),
    },
  }
}

function removeSourceReuseEvidence(
  evidence: ConformanceEvidence,
  stimulusRealizationId: string
): void {
  evidence.directSourceReuseStimulusRealizationIds = new Set(
    [...(evidence.directSourceReuseStimulusRealizationIds ?? [])].filter(
      (id) => id !== stimulusRealizationId
    )
  )
}

function expectFinding(
  result: ReturnType<typeof evaluateConformance>,
  ruleId: string,
  status: string
) {
  expect(
    result.findings.some(
      (finding) => finding.ruleId === ruleId && finding.status === status
    ),
    `Expected ${ruleId} ${status}`
  ).toBe(true)
}

function dependency(
  strength: DependencyConstraint['strength'] = 'Required'
): DependencyConstraint {
  return {
    type: 'Dependency',
    predecessorInteractionRef: 'selecting',
    successorInteractionRef: 'essay',
    rule: 'RequiresCorrectness',
    exposurePolicy: 'ConcealedUntilSatisfied',
    strength,
  }
}

describe('QD-QFD conformance', () => {
  it('is independent of target-profile capability support', () => {
    const { qd, qfd, evidence } = fixture()
    qfd.targetProfileRef = 'profile-with-no-capabilities'
    expect(evaluateConformance(qd, qfd, evidence).aggregate).toBe('CONFORMANT')
  })

  it('fails a modality allowed by a profile but disallowed by the QD', () => {
    const { qd, qfd, evidence } = fixture()
    qfd.stimulusRealizations[0].realizedModality = 'Audio'
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-STM-MOD-001', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('fails an invalid QD materialization-policy mapping', () => {
    const { qd, qfd, evidence } = fixture()
    qfd.stimulusRealizations[0].mode = 'AdaptContent'
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-STM-MAT-001', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('accepts direct source reuse and exact content equality', () => {
    const { qd, qfd, evidence } = fixture()
    qfd.stimulusRealizations[0].realizedContent = qd.stimuli[0].sourceContent
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-STM-SEM-001', 'PASS')
    expect(result.aggregate).toBe('CONFORMANT')
  })

  it('requires review for a nontrivial task-instruction reformulation', () => {
    const { qd, qfd, evidence } = fixture()
    const selecting = qfd.interactionRealizations.find(
      (realization) => realization.type === 'SelectingRealization'
    )!
    selecting.instructionRealizations[0].realizedText =
      'Choose only the options shown in bold.'
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-INS-002', 'REVIEW_REQUIRED')
    expect(result.aggregate).toBe('REVIEW_REQUIRED')
  })

  it('fails a reversed Fixed local presentation order', () => {
    const { qd, qfd, evidence } = fixture()
    const ordering = qd.responseInteractions.find(
      (interaction) => interaction.type === 'Ordering'
    )!
    ordering.itemOrderPolicy = 'Fixed'
    const realization = qfd.interactionRealizations.find(
      (interactionRealization) =>
        interactionRealization.type === 'OrderingRealization'
    )!
    if (realization.presentation.localLayout.kind === 'LayoutGroup')
      realization.presentation.localLayout.children.reverse()
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-ORD-001', 'FAIL')
  })

  it('accepts transitive QFD precedence for a QD Sequence', () => {
    const { qd, qfd, evidence } = fixture()
    qd.constraints = [
      { type: 'Sequence', interactionRefs: ['selecting', 'relating'] },
    ]
    qfd.interactionPrecedences = [
      {
        beforeInteractionRef: 'selecting',
        afterInteractionRef: 'ordering',
      },
      {
        beforeInteractionRef: 'ordering',
        afterInteractionRef: 'relating',
      },
    ]
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-SEQ-001', 'PASS')
    expect(result.aggregate).toBe('CONFORMANT')
  })

  it('fails when required QD Sequence precedence is missing', () => {
    const { qd, qfd, evidence } = fixture()
    qd.constraints = [
      { type: 'Sequence', interactionRefs: ['selecting', 'relating'] },
    ]
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-SEQ-001', 'FAIL')
  })

  it('accepts an exact Required dependency realization', () => {
    const { qd, qfd, evidence } = fixture()
    qd.constraints = [dependency()]
    qfd.dependencyRealizations = [
      {
        predecessorInteractionRef: 'selecting',
        successorInteractionRef: 'essay',
        rule: 'RequiresCorrectness',
        exposurePolicy: 'ConcealedUntilSatisfied',
      },
    ]
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-DEP-REQ-001', 'PASS')
    expect(result.aggregate).toBe('CONFORMANT')
  })

  it('fails an omitted or mismatched Required dependency', () => {
    const { qd, qfd, evidence } = fixture()
    qd.constraints = [dependency()]
    qfd.dependencyRealizations = [
      {
        predecessorInteractionRef: 'selecting',
        successorInteractionRef: 'essay',
        rule: 'RequiresCompletion',
        exposurePolicy: 'ConcealedUntilSatisfied',
      },
    ]
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-DEP-REQ-001', 'FAIL')
    expectFinding(result, 'CONF-DEP-EXTRA-001', 'FAIL')
  })

  it('warns when a Preferred dependency is omitted', () => {
    const { qd, qfd, evidence } = fixture()
    qd.constraints = [dependency('Preferred')]
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-DEP-PREF-001', 'WARNING')
    expect(result.aggregate).toBe('CONFORMANT_WITH_WARNINGS')
  })

  it('fails an extra QFD dependency with no QD semantic basis', () => {
    const { qd, qfd, evidence } = fixture()
    qfd.dependencyRealizations = [
      {
        predecessorInteractionRef: 'selecting',
        successorInteractionRef: 'essay',
        rule: 'RequiresCorrectness',
        exposurePolicy: 'ConcealedUntilSatisfied',
      },
    ]
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-DEP-EXTRA-001', 'FAIL')
  })

  it('does not infer QFD precedence from Dependency alone', () => {
    const { qd, qfd, evidence } = fixture()
    qd.constraints = [dependency()]
    qfd.dependencyRealizations = [
      {
        predecessorInteractionRef: 'selecting',
        successorInteractionRef: 'essay',
        rule: 'RequiresCorrectness',
        exposurePolicy: 'ConcealedUntilSatisfied',
      },
    ]
    qfd.interactionPrecedences = []
    expect(evaluateConformance(qd, qfd, evidence).aggregate).toBe('CONFORMANT')
  })

  it('does not treat shared Stimulus visibility as a dependency violation', () => {
    const { qd, qfd, evidence } = fixture()
    qd.associations.push({
      interactionRef: 'essay',
      stimulusRef: 'stim-select',
      role: 'Context',
    })
    qd.constraints = [dependency()]
    qfd.stimulusRealizations[0].servedInteractionRefs.push('essay')
    qfd.dependencyRealizations = [
      {
        predecessorInteractionRef: 'selecting',
        successorInteractionRef: 'essay',
        rule: 'RequiresCorrectness',
        exposurePolicy: 'ConcealedUntilSatisfied',
      },
    ]
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-CTX-001', 'PASS')
    expect(result.aggregate).toBe('CONFORMANT')
  })
})

describe('PreserveContent proof boundaries', () => {
  it('passes proven direct same-representation source reuse', () => {
    const { qd, qfd, evidence } = fixture()
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-STM-SEM-001', 'PASS')
    expectFinding(result, 'CONF-WRK-LOC-001', 'PASS')
    expect(result.aggregate).toBe('CONFORMANT')
  })

  it('does not reuse a TextAnchor automatically for cross-modal PreserveContent', () => {
    const { qd, qfd, evidence } = fixture()
    qd.stimuli[0].allowedModalities.push('Audio')
    qfd.stimulusRealizations[0].realizedModality = 'Audio'
    removeSourceReuseEvidence(evidence, 'sr-select')
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-STM-MOD-001', 'PASS')
    expectFinding(result, 'CONF-STM-SEM-001', 'REVIEW_REQUIRED')
    expectFinding(result, 'CONF-WRK-LOC-001', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('requires review for opaque but structurally complete location mappings', () => {
    const { qd, qfd, evidence } = fixture()
    removeSourceReuseEvidence(evidence, 'sr-select')
    evidence.preservedStimulusRealizationIds = new Set(['sr-select'])
    const selecting = qfd.interactionRealizations.find(
      (realization) => realization.type === 'SelectingRealization'
    )!
    selecting.workspaceRealizations[0].choiceRealizations.forEach((choice) => {
      choice.realizationAnchor = {
        kind: 'TextRealizationAnchor',
        payload: { implementationLocator: 'opaque' },
      }
    })
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-WRK-LOC-001', 'REVIEW_REQUIRED')
    expect(result.aggregate).toBe('REVIEW_REQUIRED')
  })

  it('passes narrowly scoped trusted deterministic Workspace evidence', () => {
    const { qd, qfd, evidence } = fixture()
    removeSourceReuseEvidence(evidence, 'sr-select')
    evidence.preservedStimulusRealizationIds = new Set(['sr-select'])
    evidence.trustedWorkspaceBindingKeys = new Set([
      workspaceBindingKey('selecting', 'workspace-choice'),
      workspaceBindingKey('selecting', 'workspace-choice-2'),
    ])
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-WRK-LOC-001', 'PASS')
    expect(result.aggregate).toBe('CONFORMANT')
  })

  it('fails when a required concrete Workspace location is absent', () => {
    const { qd, qfd, evidence } = fixture()
    removeSourceReuseEvidence(evidence, 'sr-select')
    evidence.preservedStimulusRealizationIds = new Set(['sr-select'])
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-WRK-LOC-001', 'FAIL')
    expect(result.aggregate).toBe('NON_CONFORMANT')
  })

  it('does not infer semantic preservation from absent realizedContent', () => {
    const { qd, qfd, evidence } = fixture()
    removeSourceReuseEvidence(evidence, 'sr-select')
    evidence.trustedWorkspaceBindingKeys = new Set([
      workspaceBindingKey('selecting', 'workspace-choice'),
      workspaceBindingKey('selecting', 'workspace-choice-2'),
    ])
    expect(qfd.stimulusRealizations[0].realizedContent).toBeUndefined()
    const result = evaluateConformance(qd, qfd, evidence)
    expectFinding(result, 'CONF-STM-SEM-001', 'REVIEW_REQUIRED')
    expect(result.aggregate).toBe('REVIEW_REQUIRED')
  })
})

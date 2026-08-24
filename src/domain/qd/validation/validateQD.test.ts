import { describe, expect, it } from 'vitest'
import type { Finding, FindingStatus } from './validateQD'
import { validateQD } from './validateQD'
import type { QuestionDefinition } from '../model'
import * as fx from '../fixtures/qdFixtures'

function statusOf(findings: Finding[], ruleId: string): FindingStatus[] {
  return findings.filter((f) => f.ruleId === ruleId).map((f) => f.status)
}

function expectRule(
  findings: Finding[],
  ruleId: string,
  expected: FindingStatus
) {
  const statuses = statusOf(findings, ruleId)
  expect(
    statuses.length,
    `expected at least one ${ruleId} finding`
  ).toBeGreaterThan(0)
  expect(
    statuses.some((s) => s === expected),
    `expected ${ruleId} to include ${expected}, got [${statuses.join(', ')}]`
  ).toBe(true)
}

function expectNoFail(findings: Finding[], ruleId: string) {
  const statuses = statusOf(findings, ruleId)
  expect(
    statuses.every((s) => s !== 'FAIL'),
    `expected no FAIL for ${ruleId}, got [${statuses.join(', ')}]`
  ).toBe(true)
}

describe('QD-FB-2.1 validation — root rules', () => {
  it('QD-VAL-001 fails when there are no interactions', () => {
    const result = validateQD({
      id: 'qd-empty',
      status: 'Draft',
      categories: [],
      responseInteractions: [],
      stimuli: [],
      interactionStimulusAssociations: [],
      constraints: [],
    })
    expectRule(result.findings, 'QD-VAL-001', 'FAIL')
    expect(result.aggregate).toBe('FAIL')
  })

  it('a minimal valid QuestionDefinition passes overall', () => {
    const result = validateQD(fx.validSingleSelect)
    expect(result.aggregate).toBe('PASS')
  })
})

describe('QD-FB-2.1 validation — Selecting (SEL)', () => {
  it('valid single-select passes all SEL rules', () => {
    const { findings, aggregate } = validateQD(fx.validSingleSelect)
    for (const rule of ['SEL-001', 'SEL-002', 'SEL-003', 'SEL-004', 'SEL-005'])
      expectNoFail(findings, rule)
    expect(aggregate).toBe('PASS')
  })

  it('SEL-005 fails when correct choice count exceeds maxSelections (M01)', () => {
    const { findings, aggregate } = validateQD(
      fx.invalidSelectingTooManyCorrect
    )
    expectRule(findings, 'SEL-005', 'FAIL')
    expect(aggregate).toBe('FAIL')
  })
})

describe('QD-FB-2.1 validation — Ordering (ORD)', () => {
  it('valid ordering passes all ORD rules', () => {
    const { findings, aggregate } = validateQD(fx.validOrderingComplete)
    for (const rule of ['ORD-001', 'ORD-002', 'ORD-003', 'ORD-004'])
      expectNoFail(findings, rule)
    expect(aggregate).toBe('PASS')
  })

  it('ORD-004 fails when correctOrder is not a permutation (M05)', () => {
    const { findings, aggregate } = validateQD(fx.invalidOrderingDuplicate)
    expectRule(findings, 'ORD-004', 'FAIL')
    expect(aggregate).toBe('FAIL')
  })
})

describe('QD-FB-2.1 validation — Relating (REL)', () => {
  it.each([
    ['OneToOne', () => fx.relatingOneToOneValid],
    ['OneToMany', () => fx.relatingOneToManyValid],
    ['ManyToOne', () => fx.relatingManyToOneValid],
    ['ManyToMany', () => fx.relatingManyToManyValid],
  ])('%s mapping passes all REL rules', (_label, get) => {
    const { findings, aggregate } = validateQD(get())
    for (const rule of [
      'REL-001',
      'REL-002',
      'REL-003',
      'REL-004',
      'REL-005',
      'REL-006',
      'REL-007',
      'REL-008',
      'REL-009',
    ]) {
      expectNoFail(findings, rule)
    }
    expect(aggregate).toBe('PASS')
  })

  it('REL-008 fails when Required participation is not satisfied', () => {
    const { findings, aggregate } = validateQD(
      fx.relatingRequiredParticipationFail
    )
    expectRule(findings, 'REL-008', 'FAIL')
    expect(aggregate).toBe('FAIL')
  })

  it('REL-007 fails when OneToOne cardinality is violated (M07)', () => {
    const { findings, aggregate } = validateQD(fx.relatingCardinalityFail)
    expectRule(findings, 'REL-007', 'FAIL')
    expect(aggregate).toBe('FAIL')
  })
})

describe('QD-FB-2.1 validation — Completing (CMP/ASC)', () => {
  it('local TextAnchor gap passes', () => {
    const { aggregate } = validateQD(fx.completingLocalTextAnchor)
    expect(aggregate).toBe('PASS')
  })

  it('TextStimulus workspace gap passes CMP-004/CMP-006/ASC-005', () => {
    const { findings, aggregate } = validateQD(
      fx.completingTextStimulusWorkspace
    )
    expectNoFail(findings, 'CMP-004')
    expectNoFail(findings, 'CMP-006')
    expectNoFail(findings, 'ASC-005')
    expect(aggregate).toBe('PASS')
  })

  it('ImageStimulus workspace DropTarget gaps pass CMP-007/CMP-012/CMP-015/CMP-016', () => {
    const { findings, aggregate } = validateQD(
      fx.completingImageStimulusWorkspace
    )
    for (const rule of ['CMP-007', 'CMP-012', 'CMP-015', 'CMP-016'])
      expectNoFail(findings, rule)
    expect(aggregate).toBe('PASS')
  })

  it('SpecificationBased stimulus without a concrete anchor passes CMP-008', () => {
    const { findings, aggregate } = validateQD(fx.completingSpecBasedNoAnchor)
    expectNoFail(findings, 'CMP-008')
    expect(aggregate).toBe('PASS')
  })

  it('CMP-004 and ASC-005 fail when a stimulus-hosted gap has no Workspace association (M20)', () => {
    const { findings, aggregate } = validateQD(
      fx.completingMissingWorkspaceAssociation
    )
    expectRule(findings, 'CMP-004', 'FAIL')
    expectRule(findings, 'ASC-005', 'FAIL')
    expect(aggregate).toBe('FAIL')
  })

  it('CMP-015 fails when no feasible item assignment exists under usage limits (M10)', () => {
    const { findings, aggregate } = validateQD(
      fx.completingDropTargetInfeasibleAssignment
    )
    expectRule(findings, 'CMP-015', 'FAIL')
    expect(aggregate).toBe('FAIL')
  })
})

describe('QD-FB-2.1 validation — ShortInput (SIN)', () => {
  it.each([
    ['Text', () => fx.shortInputTextValid],
    ['Number', () => fx.shortInputNumberValid],
    ['Date', () => fx.shortInputDateValid],
  ])('%s ShortInput passes all SIN rules', (_label, get) => {
    const { findings, aggregate } = validateQD(get())
    for (const rule of ['SIN-001', 'SIN-002', 'SIN-003', 'SIN-004'])
      expectNoFail(findings, rule)
    expect(aggregate).toBe('PASS')
  })
})

describe('QD-FB-2.1 validation — Essay (ESS) and ArtifactSubmission (ART)', () => {
  it('valid Essay passes all ESS rules', () => {
    const { findings, aggregate } = validateQD(fx.essayValid)
    for (const rule of ['ESS-001', 'ESS-002', 'ESS-003'])
      expectNoFail(findings, rule)
    expect(aggregate).toBe('PASS')
  })

  it('valid ArtifactSubmission passes all ART rules', () => {
    const { findings, aggregate } = validateQD(fx.artifactSubmissionValid)
    for (const rule of ['ART-001', 'ART-002', 'ART-003'])
      expectNoFail(findings, rule)
    expect(aggregate).toBe('PASS')
  })
})

describe('QD-FB-2.1 validation — Marking (MRK)', () => {
  it('Point mark on an ImageStimulus passes MRK-001/002/003', () => {
    const { findings, aggregate } = validateQD(fx.markingPointOnImageValid)
    for (const rule of ['MRK-001', 'MRK-002', 'MRK-003'])
      expectNoFail(findings, rule)
    expect(aggregate).toBe('PASS')
  })

  it('Region mark on an ImageStimulus passes', () => {
    const { aggregate } = validateQD(fx.markingRegionOnImageValid)
    expect(aggregate).toBe('PASS')
  })

  it('TextSpan mark on a TextStimulus passes MRK-004', () => {
    const { findings, aggregate } = validateQD(fx.markingTextSpanOnTextValid)
    expectNoFail(findings, 'MRK-004')
    expect(aggregate).toBe('PASS')
  })

  it('MRK-003 fails when a Point mark is anchored to a TextStimulus (M16)', () => {
    const { findings, aggregate } = validateQD(fx.markingInvalidModality)
    expectRule(findings, 'MRK-003', 'FAIL')
    expect(aggregate).toBe('FAIL')
  })
})

describe('QD-FB-2.1 validation — Stimulus (STM)', () => {
  it('Fixed/Adaptable/SpecificationBased stimuli all pass STM rules', () => {
    const { findings, aggregate } = validateQD(fx.stimuliMaterializationValid)
    for (const rule of ['STM-001', 'STM-002', 'STM-003', 'STM-004'])
      expectNoFail(findings, rule)
    expect(aggregate).toBe('PASS')
  })
})

describe('QD-FB-2.1 validation — constraint graph (SEQ/DEP/GRAPH)', () => {
  it('an acyclic Required graph passes GRAPH-001', () => {
    const { findings, aggregate } = validateQD(fx.acyclicGraphValid)
    expectNoFail(findings, 'GRAPH-001')
    expect(aggregate).toBe('PASS')
  })

  it('GRAPH-001 fails when Required edges form a cycle (M26)', () => {
    const { findings, aggregate } = validateQD(fx.cyclicGraphInvalid)
    expectRule(findings, 'GRAPH-001', 'FAIL')
    expect(aggregate).toBe('FAIL')
  })

  it('GRAPH-002 warns (without failing) when a Preferred edge introduces a cycle', () => {
    const { findings, aggregate } = validateQD(fx.graph002PreferredConflict)
    expectRule(findings, 'GRAPH-002', 'WARNING')
    expectNoFail(findings, 'GRAPH-001')
    expect(aggregate).toBe('PASS')
  })

  it('DEP-003 fails when a RequiresCorrectness predecessor has no formal correctness (M27)', () => {
    const { findings, aggregate } = validateQD(
      fx.dependencyRequiresCorrectnessInvalidPredecessor
    )
    expectRule(findings, 'DEP-003', 'FAIL')
    expect(aggregate).toBe('FAIL')
  })
})

describe('QD-FB-2.1 validation — corrective-pass coverage', () => {
  const asQd = (v: unknown) => v as QuestionDefinition

  it('QD-VAL-002 fails on duplicate interaction codes', () => {
    const [interaction] = fx.validSingleSelect.responseInteractions
    const qd = asQd({
      ...fx.validSingleSelect,
      responseInteractions: [
        { ...interaction },
        { ...interaction, id: 'int-select-2' },
      ],
    })
    expectRule(validateQD(qd).findings, 'QD-VAL-002', 'FAIL')
  })

  it('QD-VAL-003 fails on duplicate stimulus codes', () => {
    const [stimulus] = fx.stimuliMaterializationValid.stimuli
    const qd = asQd({
      ...fx.stimuliMaterializationValid,
      stimuli: [
        ...fx.stimuliMaterializationValid.stimuli,
        { ...stimulus, id: 'stim-dup' },
      ],
    })
    expectRule(validateQD(qd).findings, 'QD-VAL-003', 'FAIL')
  })

  it('QD-VAL-004/005 and ASC-001 fail on a dangling association reference', () => {
    const qd = asQd({
      ...fx.validSingleSelect,
      interactionStimulusAssociations: [
        {
          id: 'assoc-dangling',
          interactionRef: 'int-select-1',
          stimulusRef: 'stim-missing',
          role: 'Context',
        },
      ],
    })
    const { findings } = validateQD(qd)
    expectRule(findings, 'QD-VAL-004', 'FAIL')
    expectRule(findings, 'QD-VAL-005', 'FAIL')
    expectRule(findings, 'ASC-001', 'FAIL')
  })

  it('QD-VAL-006 warns on free-text instruction and passes when absent', () => {
    const [interaction] = fx.validSingleSelect.responseInteractions
    const withInstruction = asQd({
      ...fx.validSingleSelect,
      responseInteractions: [
        { ...interaction, instruction: 'Choose one option.' },
      ],
    })
    expectRule(validateQD(withInstruction).findings, 'QD-VAL-006', 'WARNING')
    expectRule(validateQD(fx.validSingleSelect).findings, 'QD-VAL-006', 'PASS')
  })

  it('ASC-002 fails on a duplicate interaction-stimulus association', () => {
    const qd = asQd({
      ...fx.completingTextStimulusWorkspace,
      interactionStimulusAssociations: [
        ...fx.completingTextStimulusWorkspace.interactionStimulusAssociations,
        {
          id: 'assoc-dup',
          interactionRef: 'int-cmp-text-ws',
          stimulusRef: 'stim-text-1',
          role: 'Workspace',
        },
      ],
    })
    expectRule(validateQD(qd).findings, 'ASC-002', 'FAIL')
  })

  it('ASC-004/006 pass when one stimulus has different roles per interaction', () => {
    const qd = asQd({
      ...fx.completingTextStimulusWorkspace,
      responseInteractions: [
        ...fx.completingTextStimulusWorkspace.responseInteractions,
        {
          id: 'int-select-shared',
          code: 'SHARED',
          type: 'Selecting',
          itemOrderPolicy: 'Fixed',
          minSelections: 1,
          maxSelections: 1,
          choices: [
            { id: 'c-s1', code: 'A', name: 'One', isCorrect: true },
            { id: 'c-s2', code: 'B', name: 'Two', isCorrect: false },
          ],
        },
      ],
      interactionStimulusAssociations: [
        ...fx.completingTextStimulusWorkspace.interactionStimulusAssociations,
        {
          id: 'assoc-shared',
          interactionRef: 'int-select-shared',
          stimulusRef: 'stim-text-1',
          role: 'Context',
        },
      ],
    })
    const { findings } = validateQD(qd)
    expectNoFail(findings, 'ASC-004')
    expectNoFail(findings, 'ASC-006')
  })

  it('CON-001 fails on an invalid constraint strength', () => {
    const qd = asQd({
      ...fx.acyclicGraphValid,
      constraints: [
        { ...fx.acyclicGraphValid.constraints[0], strength: 'Weird' },
      ],
    })
    expectRule(validateQD(qd).findings, 'CON-001', 'FAIL')
  })

  it('SEQ-001/002/003 fail on short, dangling, and duplicated sequences', () => {
    const oneRef = asQd({
      ...fx.validSingleSelect,
      constraints: [
        {
          id: 'seq-1',
          type: 'Sequence',
          strength: 'Required',
          interactionRefs: ['int-select-1'],
        },
      ],
    })
    expectRule(validateQD(oneRef).findings, 'SEQ-001', 'FAIL')

    const dangling = asQd({
      ...fx.validSingleSelect,
      constraints: [
        {
          id: 'seq-2',
          type: 'Sequence',
          strength: 'Required',
          interactionRefs: ['int-select-1', 'int-missing'],
        },
      ],
    })
    expectRule(validateQD(dangling).findings, 'SEQ-002', 'FAIL')

    const duplicated = asQd({
      ...fx.validSingleSelect,
      constraints: [
        {
          id: 'seq-3',
          type: 'Sequence',
          strength: 'Required',
          interactionRefs: ['int-select-1', 'int-select-1'],
        },
      ],
    })
    expectRule(validateQD(duplicated).findings, 'SEQ-003', 'FAIL')
  })

  it('DEP-001/002 fail on dangling and self dependencies', () => {
    const dangling = asQd({
      ...fx.acyclicGraphValid,
      constraints: [
        {
          id: 'dep-dangling',
          type: 'Dependency',
          strength: 'Required',
          predecessorInteractionRef: 'int-missing',
          successorInteractionRef: 'int-sin-text',
          rule: 'RequiresCompletion',
        },
      ],
    })
    expectRule(validateQD(dangling).findings, 'DEP-001', 'FAIL')

    const self = asQd({
      ...fx.acyclicGraphValid,
      constraints: [
        {
          id: 'dep-self',
          type: 'Dependency',
          strength: 'Required',
          predecessorInteractionRef: 'int-sin-text',
          successorInteractionRef: 'int-sin-text',
          rule: 'RequiresCompletion',
        },
      ],
    })
    expectRule(validateQD(self).findings, 'DEP-002', 'FAIL')
  })

  it('CMP-001/003 fail on gap-less and localContent-less Completing (M09)', () => {
    const gapLess = asQd({
      ...fx.validSingleSelect,
      responseInteractions: [
        {
          id: 'int-cmp-empty',
          code: 'Q4f',
          type: 'Completing',
          completingItems: [],
          completingGaps: [],
        },
      ],
    })
    expectRule(validateQD(gapLess).findings, 'CMP-001', 'FAIL')

    const { findings } = validateQD(fx.completingMissingLocalContent)
    expectRule(findings, 'CMP-003', 'FAIL')
  })

  it('CMP-009/010/011/014 fail on invalid gap values, bounds, domains, and usage limits', () => {
    const noCorrect = asQd({
      ...fx.completingLocalTextAnchor,
      responseInteractions: [
        {
          ...fx.completingLocalTextAnchor.responseInteractions[0],
          completingGaps: [
            {
              id: 'gap-nocorrect',
              code: 'gapX',
              anchor: { kind: 'TextAnchor', marker: '{{x}}' },
              type: 'TextInputGap',
              correctValues: [],
              caseSensitive: false,
              trimWhitespace: true,
            },
          ],
        },
      ],
    })
    expectRule(validateQD(noCorrect).findings, 'CMP-009', 'FAIL')

    const badBounds = asQd({
      ...fx.completingLocalTextAnchor,
      responseInteractions: [
        {
          ...fx.completingLocalTextAnchor.responseInteractions[0],
          completingGaps: [
            {
              id: 'gap-bounds',
              code: 'gapY',
              anchor: { kind: 'TextAnchor', marker: '{{y}}' },
              type: 'TextInputGap',
              correctValues: ['ok'],
              minLength: 5,
              maxLength: 2,
              caseSensitive: false,
              trimWhitespace: true,
            },
          ],
        },
      ],
    })
    expectRule(validateQD(badBounds).findings, 'CMP-010', 'FAIL')

    const badDomain = asQd({
      ...fx.completingImageStimulusWorkspace,
      responseInteractions: [
        {
          ...fx.completingImageStimulusWorkspace.responseInteractions[0],
          completingGaps: [
            {
              id: 'gap-3',
              code: 'label1',
              stimulusRef: 'stim-image-1',
              anchor: {
                kind: 'RegionAnchor',
                x: 0.2,
                y: 0.2,
                width: 0.1,
                height: 0.1,
              },
              type: 'NumberInputGap',
              correctValues: [12],
              minValue: 0,
              maxValue: 10,
            },
            {
              id: 'gap-4',
              code: 'label2',
              stimulusRef: 'stim-image-1',
              anchor: {
                kind: 'RegionAnchor',
                x: 0.5,
                y: 0.5,
                width: 0.1,
                height: 0.1,
              },
              type: 'DropTargetGap',
              correctItemRefs: ['item-2'],
            },
          ],
        },
      ],
    })
    expectRule(validateQD(badDomain).findings, 'CMP-011', 'FAIL')

    const badUsage = asQd({
      ...fx.completingImageStimulusWorkspace,
      responseInteractions: [
        {
          ...fx.completingImageStimulusWorkspace.responseInteractions[0],
          completingItems: [
            {
              id: 'item-1',
              code: 'nucleus',
              type: 'TextCompletingItem',
              text: 'Nucleus',
              usageLimit: 0,
            },
          ],
        },
      ],
    })
    expectRule(validateQD(badUsage).findings, 'CMP-014', 'FAIL')

    expectNoFail(
      validateQD(fx.completingImageStimulusWorkspace).findings,
      'CMP-013'
    )
  })

  it('SIN-001/002/003/004 fail on missing, mistyped, and out-of-domain values', () => {
    const base = fx.shortInputNumberValid.responseInteractions[0]
    expectRule(
      validateQD(
        asQd({
          ...fx.shortInputNumberValid,
          responseInteractions: [{ ...base, correctValues: [] }],
        })
      ).findings,
      'SIN-001',
      'FAIL'
    )
    expectRule(
      validateQD(
        asQd({
          ...fx.shortInputNumberValid,
          responseInteractions: [{ ...base, correctValues: ['3'] }],
        })
      ).findings,
      'SIN-002',
      'FAIL'
    )
    expectRule(
      validateQD(
        asQd({
          ...fx.shortInputNumberValid,
          responseInteractions: [{ ...base, minValue: 10, maxValue: 1 }],
        })
      ).findings,
      'SIN-003',
      'FAIL'
    )
    expectRule(
      validateQD(
        asQd({
          ...fx.shortInputNumberValid,
          responseInteractions: [{ ...base, correctValues: [200] }],
        })
      ).findings,
      'SIN-004',
      'FAIL'
    )
  })

  it('ESS-001/002/003 fail on negative, unit-less, and reversed bounds', () => {
    const base = fx.essayValid.responseInteractions[0]
    expectRule(
      validateQD(
        asQd({
          ...fx.essayValid,
          responseInteractions: [{ ...base, minLength: -1 }],
        })
      ).findings,
      'ESS-001',
      'FAIL'
    )
    expectRule(
      validateQD(
        asQd({
          ...fx.essayValid,
          responseInteractions: [{ ...base, lengthUnit: undefined }],
        })
      ).findings,
      'ESS-002',
      'FAIL'
    )
    expectRule(
      validateQD(
        asQd({
          ...fx.essayValid,
          responseInteractions: [{ ...base, minLength: 50, maxLength: 20 }],
        })
      ).findings,
      'ESS-003',
      'FAIL'
    )
  })

  it('ART-001/002/003 fail on invalid artifact constraints', () => {
    const base = fx.artifactSubmissionValid.responseInteractions[0]
    expectRule(
      validateQD(
        asQd({
          ...fx.artifactSubmissionValid,
          responseInteractions: [{ ...base, minArtifacts: 0 }],
        })
      ).findings,
      'ART-001',
      'FAIL'
    )
    expectRule(
      validateQD(
        asQd({
          ...fx.artifactSubmissionValid,
          responseInteractions: [{ ...base, minArtifacts: 3, maxArtifacts: 1 }],
        })
      ).findings,
      'ART-002',
      'FAIL'
    )
    expectRule(
      validateQD(
        asQd({
          ...fx.artifactSubmissionValid,
          responseInteractions: [{ ...base, artifactSpecification: '   ' }],
        })
      ).findings,
      'ART-003',
      'FAIL'
    )
  })

  it('STM-001/002/003 fail on policy/content mismatches', () => {
    const textStimulus = fx.completingTextStimulusWorkspace.stimuli[0]
    expectRule(
      validateQD(
        asQd({
          ...fx.completingTextStimulusWorkspace,
          stimuli: [{ ...textStimulus, content: undefined }],
        })
      ).findings,
      'STM-001',
      'FAIL'
    )
    expectRule(
      validateQD(
        asQd({
          ...fx.completingTextStimulusWorkspace,
          stimuli: [
            {
              ...textStimulus,
              materializationPolicy: 'Adaptable',
              contentSpecification: undefined,
            },
          ],
        })
      ).findings,
      'STM-002',
      'FAIL'
    )

    const specStimulus = fx.completingSpecBasedNoAnchor.stimuli[0]
    expectRule(
      validateQD(
        asQd({
          ...fx.completingSpecBasedNoAnchor,
          stimuli: [{ ...specStimulus, contentSpecification: undefined }],
        })
      ).findings,
      'STM-003',
      'FAIL'
    )
  })

  it('MRK-001/002/004 fail on bad bounds, missing Workspace, and wrong modality', () => {
    const base = fx.markingPointOnImageValid.responseInteractions[0]
    expectRule(
      validateQD(
        asQd({
          ...fx.markingPointOnImageValid,
          responseInteractions: [{ ...base, minMarks: 3, maxMarks: 1 }],
        })
      ).findings,
      'MRK-001',
      'FAIL'
    )
    expectRule(
      validateQD(
        asQd({
          ...fx.markingPointOnImageValid,
          interactionStimulusAssociations: [],
        })
      ).findings,
      'MRK-002',
      'FAIL'
    )
    expectRule(
      validateQD(
        asQd({
          ...fx.markingPointOnImageValid,
          responseInteractions: [{ ...base, markType: 'TextSpan' }],
        })
      ).findings,
      'MRK-004',
      'FAIL'
    )
  })

  it('M11: AudioStimulus with Workspace role fails ASC-003', () => {
    const { findings, aggregate } = validateQD(fx.audioStimulusWorkspaceInvalid)
    expectRule(findings, 'ASC-003', 'FAIL')
    expect(aggregate).toBe('FAIL')
  })
})

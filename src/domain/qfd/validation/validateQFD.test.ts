import { describe, expect, it } from 'vitest'
import { validateQFD } from './validateQFD'
import type { QuestionDefinition } from '../../qd/model'
import type { QuestionFormDefinition } from '../model'
import * as fx from '../fixtures/qfdFixtures'

function statuses(
  findings: ReturnType<typeof validateQFD>['findings'],
  ruleId: string
) {
  return findings.filter((f) => f.ruleId === ruleId).map((f) => f.status)
}

function expectFail(
  findings: ReturnType<typeof validateQFD>['findings'],
  ruleId: string
) {
  const s = statuses(findings, ruleId)
  expect(
    s.some((x) => x === 'FAIL'),
    `expected FAIL for ${ruleId}, got [${s.join(', ')}]`
  ).toBe(true)
}

function expectPass(
  findings: ReturnType<typeof validateQFD>['findings'],
  ruleId: string
) {
  const s = statuses(findings, ruleId)
  expect(
    s.some((x) => x === 'PASS'),
    `expected PASS for ${ruleId}, got [${s.join(', ')}]`
  ).toBe(true)
}

describe('QFD-FB-1.2 internal validation', () => {
  it('Q1 web QFD passes validation', () => {
    const result = validateQFD(fx.q1QfdWeb, fx.q1Qd)
    expect(result.aggregate).toBe('PASS')
  })

  it('Q3 web QFD (Grid layout + stimulus) passes validation', () => {
    const result = validateQFD(fx.q3QfdWeb, fx.q3Qd)
    expect(result.aggregate).toBe('PASS')
  })

  it('Q4 web QFD (Inline layout) passes validation', () => {
    const result = validateQFD(fx.q4QfdWeb, fx.q4Qd)
    expect(result.aggregate).toBe('PASS')
  })

  it('Q8A web QFD (Canvas layout) passes validation', () => {
    const result = validateQFD(fx.q8aQfdWeb, fx.q8aQd)
    expect(result.aggregate).toBe('PASS')
  })

  it('Q12 web QFD (three interactions) passes validation', () => {
    const result = validateQFD(fx.q12QfdWeb, fx.q12Qd)
    expect(result.aggregate).toBe('PASS')
  })

  it('M02: root layout is an InteractionBlock instead of a ContainerElement -> QFD-VAL-LAY-002 FAIL', () => {
    const result = validateQFD(fx.q1QfdInvalidRootLayout, fx.q1Qd)
    expectFail(result.findings, 'QFD-VAL-LAY-002')
    expect(result.aggregate).toBe('FAIL')
  })

  it('M04: duplicate InteractionRealization for the same QD interaction -> QFD-VAL-IR-002 FAIL', () => {
    const result = validateQFD(fx.q1QfdDuplicateIr, fx.q1Qd)
    expectFail(result.findings, 'QFD-VAL-IR-002')
    expect(result.aggregate).toBe('FAIL')
  })

  it('questionDefinitionRef not matching the provided QD -> QFD-VAL-002 FAIL', () => {
    const result = validateQFD(fx.q1QfdWeb, fx.q2Qd)
    expectFail(result.findings, 'QFD-VAL-002')
  })

  it('unregistered targetProfileRef -> QFD-VAL-003 FAIL', () => {
    const invalid = {
      ...fx.q1QfdWeb,
      targetProfileRef: 'UnknownProfile' as never,
    }
    const result = validateQFD(invalid, fx.q1Qd)
    expectFail(result.findings, 'QFD-VAL-003')
  })

  it('IR referencing an unknown interaction -> QFD-VAL-IR-001 and QFD-VAL-005 FAIL', () => {
    const invalid = {
      ...fx.q1QfdWeb,
      interactionRealizations: [
        {
          id: 'ir-bad',
          interactionRef: 'nonexistent',
          mechanism: 'ListSelection' as const,
        },
      ],
    }
    const result = validateQFD(invalid, fx.q1Qd)
    expectFail(result.findings, 'QFD-VAL-IR-001')
    expectFail(result.findings, 'QFD-VAL-005')
  })

  it('unregistered mechanism -> QFD-VAL-IR-004 FAIL', () => {
    const invalid = {
      ...fx.q1QfdWeb,
      interactionRealizations: [
        {
          id: 'ir-q1',
          interactionRef: 'q1-select',
          mechanism: 'NotAMechanism' as never,
        },
      ],
    }
    const result = validateQFD(invalid, fx.q1Qd)
    expectFail(result.findings, 'QFD-VAL-IR-004')
  })

  it('empty realizedInstruction -> QFD-VAL-IR-005 FAIL', () => {
    const invalid = {
      ...fx.q1QfdWeb,
      interactionRealizations: [
        {
          id: 'ir-q1',
          interactionRef: 'q1-select',
          mechanism: 'ListSelection' as const,
          realizedInstruction: '   ',
        },
      ],
    }
    const result = validateQFD(invalid, fx.q1Qd)
    expectFail(result.findings, 'QFD-VAL-IR-005')
  })

  it('SR for unknown stimulus -> QFD-VAL-SR-001 FAIL', () => {
    const invalid = {
      ...fx.q3QfdWeb,
      stimulusRealizations: [
        {
          id: 'sr-bad',
          stimulusRef: 'nonexistent',
          mode: 'ReuseSource' as const,
        },
      ],
    }
    const result = validateQFD(invalid, fx.q3Qd)
    expectFail(result.findings, 'QFD-VAL-SR-001')
  })

  it('ReuseSource with realizedContent -> QFD-VAL-SR-004 FAIL', () => {
    const invalid = {
      ...fx.q3QfdWeb,
      stimulusRealizations: [
        {
          id: 'sr-q3',
          stimulusRef: 'q3-text',
          mode: 'ReuseSource' as const,
          realizedContent: 'oops',
        },
      ],
    }
    const result = validateQFD(invalid, fx.q3Qd)
    expectFail(result.findings, 'QFD-VAL-SR-004')
  })

  it('AdaptSource without realizedContent -> QFD-VAL-SR-005 FAIL', () => {
    const invalid = {
      ...fx.q11QfdWeb,
      stimulusRealizations: [
        {
          id: 'sr-q11',
          stimulusRef: 'q11-chart',
          mode: 'AdaptSource' as const,
        },
      ],
    }
    const result = validateQFD(invalid, fx.q11Qd)
    expectFail(result.findings, 'QFD-VAL-SR-005')
  })

  it('MaterializeFromSpecification without realizedContent -> QFD-VAL-SR-006 FAIL', () => {
    const invalid = {
      ...fx.q10QfdWeb,
      stimulusRealizations: [
        {
          id: 'sr-q10',
          stimulusRef: 'q10-heart-spec',
          mode: 'MaterializeFromSpecification' as const,
        },
      ],
    }
    const result = validateQFD(invalid, fx.q10Qd)
    expectFail(result.findings, 'QFD-VAL-SR-006')
  })

  it('Canvas area outside the unit square -> QFD-VAL-CAN-001 FAIL', () => {
    const invalid = {
      ...fx.q8aQfdWeb,
      rootLayout: {
        kind: 'Canvas' as const,
        items: [
          {
            child: {
              kind: 'InteractionBlock' as const,
              interactionRealizationRef: 'ir-qfd-q8a-web',
            },
            area: { x: 0.9, y: 0.9, width: 0.5, height: 0.5 },
            layer: 0,
          },
        ],
      },
    }
    const result = validateQFD(invalid, fx.q8aQd)
    expectFail(result.findings, 'QFD-VAL-CAN-001')
  })

  it('Grid item exceeding declared rows/columns -> QFD-VAL-GRD-001 FAIL', () => {
    const invalid = {
      ...fx.q3QfdWeb,
      rootLayout: {
        kind: 'Grid' as const,
        rows: 1,
        columns: 1,
        items: [
          {
            child: {
              kind: 'InteractionBlock' as const,
              interactionRealizationRef: 'ir-q3',
            },
            row: 0,
            column: 0,
            rowSpan: 2,
            columnSpan: 1,
          },
        ],
      },
    }
    const result = validateQFD(invalid, fx.q3Qd)
    expectFail(result.findings, 'QFD-VAL-GRD-001')
  })

  it('empty container -> QFD-VAL-LAY-006 FAIL', () => {
    const invalid = {
      ...fx.q1QfdWeb,
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Vertical' as const,
        children: [],
      },
    }
    const result = validateQFD(invalid, fx.q1Qd)
    expectFail(result.findings, 'QFD-VAL-LAY-006')
  })

  it('shared layout node object under multiple parents -> QFD-VAL-LAY-003/005 FAIL', () => {
    const sharedBlock = {
      kind: 'InteractionBlock' as const,
      interactionRealizationRef: 'ir-q1',
    }
    const invalid = {
      ...fx.q1QfdWeb,
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Vertical' as const,
        children: [sharedBlock, sharedBlock],
      },
    }
    const result = validateQFD(invalid, fx.q1Qd)
    expectFail(result.findings, 'QFD-VAL-LAY-003')
    expectFail(result.findings, 'QFD-VAL-LAY-005')
  })

  it('ResponseElementBlock referencing an unknown element -> QFD-VAL-BLK-RES-001 FAIL', () => {
    const invalid = {
      ...fx.q9QfdWeb,
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Vertical' as const,
        children: [
          {
            kind: 'ResponseElementBlock' as const,
            elementKind: 'Choice' as const,
            elementRef: 'nonexistent',
          },
        ],
      },
    }
    const result = validateQFD(invalid, fx.q9Qd)
    expectFail(result.findings, 'QFD-VAL-BLK-RES-001')
  })
})

describe('QFD-FB-1.2 internal validation — corrective-pass coverage', () => {
  it('QFD-VAL-001 fails when a required root field is missing', () => {
    const invalid = {
      ...fx.q1QfdWeb,
      rootLayout: undefined,
    } as unknown as QuestionFormDefinition
    expectFail(validateQFD(invalid, fx.q1Qd).findings, 'QFD-VAL-001')
  })

  it('QFD-VAL-004 fails on duplicate InteractionRealization ids', () => {
    const [ir] = fx.q1QfdWeb.interactionRealizations
    const invalid = { ...fx.q1QfdWeb, interactionRealizations: [ir, { ...ir }] }
    expectFail(validateQFD(invalid, fx.q1Qd).findings, 'QFD-VAL-004')
  })

  it('QFD-VAL-SR-002 fails on duplicate StimulusRealizations for one stimulus', () => {
    const [sr] = fx.q5QfdWeb.stimulusRealizations
    const invalid = {
      ...fx.q5QfdWeb,
      stimulusRealizations: [sr, { ...sr, id: 'sr-dup' }],
    }
    expectFail(validateQFD(invalid, fx.q5Qd).findings, 'QFD-VAL-SR-002')
  })

  it('QFD-VAL-SR-003 fails on an unregistered realization mode', () => {
    const invalid = {
      ...fx.q5QfdWeb,
      stimulusRealizations: [
        { ...fx.q5QfdWeb.stimulusRealizations[0], mode: 'Wrong' },
      ],
    } as unknown as QuestionFormDefinition
    expectFail(validateQFD(invalid, fx.q5Qd).findings, 'QFD-VAL-SR-003')
  })

  it('QFD-VAL-SR-007 passes for an AdaptSource realization carrying content', () => {
    expectPass(validateQFD(fx.q11QfdWeb, fx.q11Qd).findings, 'QFD-VAL-SR-007')
  })

  it('QFD-VAL-LAY-001/004 and STK-001 pass on a well-formed Stack', () => {
    const { findings } = validateQFD(fx.q1QfdWeb, fx.q1Qd)
    expectPass(findings, 'QFD-VAL-LAY-001')
    expectPass(findings, 'QFD-VAL-LAY-004')
    expectPass(findings, 'QFD-VAL-STK-001')
  })

  it('QFD-VAL-LAY-004 fails on a cyclic layout tree', () => {
    const cycle: unknown = {
      kind: 'Stack',
      direction: 'Vertical',
      children: [] as unknown[],
    }
    ;(cycle as { children: unknown[] }).children.push(cycle)
    const invalid = {
      ...fx.q1QfdWeb,
      rootLayout: cycle,
    } as unknown as QuestionFormDefinition
    expectFail(validateQFD(invalid, fx.q1Qd).findings, 'QFD-VAL-LAY-004')
  })

  it('QFD-VAL-CAN-002 fails on a non-integer Canvas layer', () => {
    const root = fx.q9QfdWeb.rootLayout as unknown as {
      items: Array<{ area: unknown; layer: number; child: unknown }>
    }
    const invalid = {
      ...fx.q9QfdWeb,
      rootLayout: {
        ...root,
        items: root.items.map((item, i) =>
          i === 0 ? { ...item, layer: 1.5 } : item
        ),
      },
    } as unknown as QuestionFormDefinition
    expectFail(validateQFD(invalid, fx.q9Qd).findings, 'QFD-VAL-CAN-002')
  })

  it('QFD-VAL-INL-001/002 pass on valid Inline, and INL-002 fails on an empty marker', () => {
    expectPass(validateQFD(fx.q4QfdWeb, fx.q4Qd).findings, 'QFD-VAL-INL-001')
    expectPass(validateQFD(fx.q4QfdWeb, fx.q4Qd).findings, 'QFD-VAL-INL-002')

    const invalid = {
      ...fx.q4QfdWeb,
      rootLayout: {
        kind: 'Inline' as const,
        items: [
          {
            ...(fx.q4QfdWeb.rootLayout as { items: { child: unknown }[] })
              .items[0],
            anchor: { kind: 'TextAnchor' as const, marker: '   ' },
          },
        ],
      },
    } as unknown as QuestionFormDefinition
    expectFail(validateQFD(invalid, fx.q4Qd).findings, 'QFD-VAL-INL-002')
  })

  it('QFD-VAL-INL-003 fails when an Inline gap resolves to an ambiguous text Workspace pair', () => {
    const qd: QuestionDefinition = {
      id: 'qd-inl003',
      status: 'Draft',
      categories: [],
      responseInteractions: [
        {
          id: 'int-cmp-inl',
          code: 'INL3',
          type: 'Completing',
          completingItems: [],
          completingGaps: [
            {
              id: 'gap-inl',
              code: 'gap1',
              stimulusRef: 'stim-a',
              type: 'TextInputGap',
              correctValues: ['x'],
              caseSensitive: false,
              trimWhitespace: true,
            },
          ],
        },
      ],
      stimuli: [
        {
          id: 'stim-a',
          code: 'SA',
          type: 'Text',
          description: 'A',
          materializationPolicy: 'Fixed',
          content: 'aaa',
        },
        {
          id: 'stim-b',
          code: 'SB',
          type: 'Text',
          description: 'B',
          materializationPolicy: 'Fixed',
          content: 'bbb',
        },
      ],
      interactionStimulusAssociations: [
        {
          id: 'assoc-a',
          interactionRef: 'int-cmp-inl',
          stimulusRef: 'stim-a',
          role: 'Workspace',
        },
        {
          id: 'assoc-b',
          interactionRef: 'int-cmp-inl',
          stimulusRef: 'stim-b',
          role: 'Workspace',
        },
      ],
      constraints: [],
    }
    const qfd: QuestionFormDefinition = {
      id: 'qfd-inl003',
      questionDefinitionRef: 'qd-inl003',
      targetProfileRef: 'InteractiveWebProfile',
      interactionRealizations: [
        {
          id: 'ir-inl',
          interactionRef: 'int-cmp-inl',
          mechanism: 'Completion',
        },
      ],
      stimulusRealizations: [
        { id: 'sr-a', stimulusRef: 'stim-a', mode: 'ReuseSource' },
      ],
      rootLayout: {
        kind: 'Inline',
        items: [
          {
            child: {
              kind: 'ResponseElementBlock',
              elementKind: 'CompletingGap',
              elementRef: 'gap-inl',
            },
          },
        ],
      },
    }
    expectFail(validateQFD(qfd, qd).findings, 'QFD-VAL-INL-003')
  })

  it('QFD-VAL-BLK-STM-001 / BLK-INT-001 fail on dangling block references', () => {
    const badStimulus = {
      ...fx.q1QfdWeb,
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Vertical' as const,
        children: [
          {
            kind: 'StimulusBlock' as const,
            stimulusRealizationRef: 'sr-missing',
          },
        ],
      },
    }
    expectFail(
      validateQFD(badStimulus, fx.q1Qd).findings,
      'QFD-VAL-BLK-STM-001'
    )

    const badInteraction = {
      ...fx.q1QfdWeb,
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Vertical' as const,
        children: [
          {
            kind: 'InteractionBlock' as const,
            interactionRealizationRef: 'ir-missing',
          },
        ],
      },
    }
    expectFail(
      validateQFD(badInteraction, fx.q1Qd).findings,
      'QFD-VAL-BLK-INT-001'
    )
  })

  it('QFD-VAL-BLK-RES-002 fails when a response element belongs to two interactions', () => {
    const qd: QuestionDefinition = {
      id: 'qd-blk002',
      status: 'Draft',
      categories: [],
      responseInteractions: [
        {
          id: 'int-a',
          code: 'A',
          type: 'Selecting',
          itemOrderPolicy: 'Fixed',
          minSelections: 1,
          maxSelections: 1,
          choices: [
            { id: 'shared-choice', code: 'A', name: 'One', isCorrect: true },
          ],
        },
        {
          id: 'int-b',
          code: 'B',
          type: 'Selecting',
          itemOrderPolicy: 'Fixed',
          minSelections: 1,
          maxSelections: 1,
          choices: [
            { id: 'shared-choice', code: 'B', name: 'Two', isCorrect: false },
          ],
        },
      ],
      stimuli: [],
      interactionStimulusAssociations: [],
      constraints: [],
    }
    const qfd: QuestionFormDefinition = {
      id: 'qfd-blk002',
      questionDefinitionRef: 'qd-blk002',
      targetProfileRef: 'InteractiveWebProfile',
      interactionRealizations: [
        { id: 'ir-a', interactionRef: 'int-a', mechanism: 'ListSelection' },
        { id: 'ir-b', interactionRef: 'int-b', mechanism: 'ListSelection' },
      ],
      stimulusRealizations: [],
      rootLayout: {
        kind: 'Stack',
        direction: 'Vertical',
        children: [
          { kind: 'InteractionBlock', interactionRealizationRef: 'ir-a' },
          { kind: 'InteractionBlock', interactionRealizationRef: 'ir-b' },
          {
            kind: 'ResponseElementBlock',
            elementKind: 'Choice',
            elementRef: 'shared-choice',
          },
        ],
      },
    }
    expectFail(validateQFD(qfd, qd).findings, 'QFD-VAL-BLK-RES-002')
  })
})

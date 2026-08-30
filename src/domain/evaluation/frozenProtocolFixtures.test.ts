import { describe, expect, it } from 'vitest'
import type { Content, DependencyConstraint } from '../qd/model'
import type {
  CompletingRealization,
  OrderingRealization,
  RelatingRealization,
  SelectingRealization,
} from '../qfd/model'
import {
  CONVENTIONAL_PAPER_PROFILE,
  FROZEN_BOUNDARY_CASES,
  FROZEN_PRIMARY_CASES,
  INTERACTIVE_WEB_PROFILE,
  type FrozenEvaluationCase,
} from './frozenProtocolFixtures'

function primary(prefix: string, profile = 'InteractiveWebProfile') {
  const result = FROZEN_PRIMARY_CASES.find(({ id }) =>
    id.startsWith(`${prefix}-${profile}`)
  )
  if (!result)
    throw new Error(`Missing primary fixture '${prefix}-${profile}'.`)
  return result
}

function boundary(id: string) {
  const result = FROZEN_BOUNDARY_CASES.find((testCase) => testCase.id === id)
  if (!result) throw new Error(`Missing boundary fixture '${id}'.`)
  return result
}

function contentText(content: Content | undefined): string | undefined {
  return typeof content === 'string' ? content : content?.representation
}

function selecting(testCase: FrozenEvaluationCase): SelectingRealization {
  const realization = testCase.qfd.interactionRealizations.find(
    ({ type }) => type === 'SelectingRealization'
  )
  if (realization?.type !== 'SelectingRealization')
    throw new Error(`Missing SelectingRealization in '${testCase.id}'.`)
  return realization
}

function ordering(testCase: FrozenEvaluationCase): OrderingRealization {
  const realization = testCase.qfd.interactionRealizations.find(
    ({ type }) => type === 'OrderingRealization'
  )
  if (realization?.type !== 'OrderingRealization')
    throw new Error(`Missing OrderingRealization in '${testCase.id}'.`)
  return realization
}

function relating(testCase: FrozenEvaluationCase): RelatingRealization {
  const realization = testCase.qfd.interactionRealizations.find(
    ({ type }) => type === 'RelatingRealization'
  )
  if (realization?.type !== 'RelatingRealization')
    throw new Error(`Missing RelatingRealization in '${testCase.id}'.`)
  return realization
}

function completing(testCase: FrozenEvaluationCase): CompletingRealization {
  const realization = testCase.qfd.interactionRealizations.find(
    ({ type }) => type === 'CompletingRealization'
  )
  if (realization?.type !== 'CompletingRealization')
    throw new Error(`Missing CompletingRealization in '${testCase.id}'.`)
  return realization
}

describe('frozen evaluation profile contracts', () => {
  it('reproduces the exact controlled Web and Paper capability fixtures', () => {
    expect(INTERACTIVE_WEB_PROFILE).toEqual({
      id: 'InteractiveWebProfile',
      supportedStimulusModalities: ['Text', 'Image', 'Audio', 'Video'],
      capabilities: [
        'TextualPresentation',
        'ExpandedSelection',
        'CollapsedSelection',
        'DirectWorkspaceSelection',
        'DirectOrdering',
        'DirectRelationConstruction',
        'DirectItemPlacement',
        'EmbeddedGapResponse',
        'ScalarResponse',
        'ExtendedTextResponse',
        'DigitalArtifactSubmission',
        'PointMarking',
        'RegionMarking',
        'TextSpanMarking',
        'HorizontalComposition',
        'VerticalComposition',
        'TextAnchoredPlacement',
        'RegionAnchoredPlacement',
        'LogicalInteractionPrecedence',
        'CompletionGating',
        'CorrectnessGating',
        'ConditionalConcealment',
      ],
    })
    expect(CONVENTIONAL_PAPER_PROFILE).toEqual({
      id: 'ConventionalPaperProfile',
      supportedStimulusModalities: ['Text', 'Image'],
      capabilities: [
        'TextualPresentation',
        'ExpandedSelection',
        'ReferencedWorkspaceSelection',
        'OrderNotation',
        'RelationNotation',
        'EmbeddedGapResponse',
        'ScalarResponse',
        'ExtendedTextResponse',
        'PhysicalArtifactSubmission',
        'PointMarking',
        'RegionMarking',
        'TextSpanMarking',
        'HorizontalComposition',
        'VerticalComposition',
        'TextAnchoredPlacement',
        'RegionAnchoredPlacement',
        'LogicalInteractionPrecedence',
      ],
    })
  })
})

describe('Q1–Q12 frozen scenario contracts', () => {
  it('Q1 is exactly-two-of-four noble gases with Collapsed/Expanded forms', () => {
    const web = primary('Q1')
    const paper = primary('Q1', 'ConventionalPaperProfile')
    expect(web.qd.responseInteractions).toEqual([
      {
        id: 'select',
        type: 'Selecting',
        instruction: 'Select exactly two noble gases.',
        minSelections: 2,
        maxSelections: 2,
        standaloneChoiceOrderPolicy: 'Permutable',
        choices: [
          { id: 'he', semanticContent: 'Helium', isCorrect: true },
          { id: 'o', semanticContent: 'Oxygen', isCorrect: false },
          { id: 'ne', semanticContent: 'Neon', isCorrect: true },
          { id: 'n', semanticContent: 'Nitrogen', isCorrect: false },
        ],
      },
    ])
    expect(selecting(web).standaloneSelection?.mode).toBe('Collapsed')
    expect(selecting(paper).standaloneSelection?.mode).toBe('Expanded')
  })

  it('Q2 preserves the four frozen mitosis items, initial order, and correct order', () => {
    const web = primary('Q2')
    const paper = primary('Q2', 'ConventionalPaperProfile')
    expect(web.qd.responseInteractions[0]).toMatchObject({
      type: 'Ordering',
      instruction: 'Put the phases of mitosis in order from first to last.',
      itemOrderPolicy: 'Permutable',
      orderingItems: [
        { id: 'metaphase', semanticContent: 'Metaphase' },
        { id: 'telophase', semanticContent: 'Telophase' },
        { id: 'prophase', semanticContent: 'Prophase' },
        { id: 'anaphase', semanticContent: 'Anaphase' },
      ],
      correctOrder: ['prophase', 'metaphase', 'anaphase', 'telophase'],
    })
    expect(ordering(web).mode).toBe('DirectOrdering')
    expect(ordering(paper).mode).toBe('OrderNotation')
  })

  it('Q3 preserves all three Fixed country/capital mappings and exact Context text', () => {
    const web = primary('Q3')
    const paper = primary('Q3', 'ConventionalPaperProfile')
    expect(web.qd.responseInteractions[0]).toMatchObject({
      type: 'Relating',
      instruction: 'Match each country to its capital.',
      mappingType: 'OneToOne',
      sourceParticipationPolicy: 'Required',
      sourceSet: {
        elementOrderPolicy: 'Fixed',
        relatingElements: [
          { id: 'france', semanticContent: 'France' },
          { id: 'italy', semanticContent: 'Italy' },
          { id: 'spain', semanticContent: 'Spain' },
        ],
      },
      targetSet: {
        elementOrderPolicy: 'Fixed',
        relatingElements: [
          { id: 'paris', semanticContent: 'Paris' },
          { id: 'rome', semanticContent: 'Rome' },
          { id: 'madrid', semanticContent: 'Madrid' },
        ],
      },
      correctRelations: [
        { sourceElementRef: 'france', targetElementRef: 'paris' },
        { sourceElementRef: 'italy', targetElementRef: 'rome' },
        { sourceElementRef: 'spain', targetElementRef: 'madrid' },
      ],
    })
    expect(contentText(web.qd.stimuli[0].sourceContent)).toBe(
      'France has Paris as its capital. Italy has Rome as its capital. Spain has Madrid as its capital.'
    )
    expect(web.qd.associations).toEqual([
      { interactionRef: 'rel', stimulusRef: 'q3-text', role: 'Context' },
    ])
    expect(relating(web).mode).toBe('DirectRelationConstruction')
    expect(relating(paper).mode).toBe('RelationNotation')
  })

  it('Q4 preserves the exact Text Workspace, two gaps, shared pool, and distractor', () => {
    const web = primary('Q4')
    const paper = primary('Q4', 'ConventionalPaperProfile')
    expect(contentText(web.qd.stimuli[0].sourceContent)).toBe(
      'During photosynthesis, plants take in {{gap-1}} and release {{gap-2}}.'
    )
    expect(web.qd.responseInteractions[0]).toMatchObject({
      type: 'Completing',
      completingItems: [
        { id: 'co2', semanticContent: 'carbon dioxide', usageLimit: 1 },
        { id: 'o2', semanticContent: 'oxygen', usageLimit: 1 },
        { id: 'n2', semanticContent: 'nitrogen', usageLimit: 1 },
      ],
      completingGaps: [
        { id: 'gap-1', correctItemRefs: ['co2'] },
        { id: 'gap-2', correctItemRefs: ['o2'] },
      ],
    })
    expect(completing(web).gapRealizations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assignmentMode: 'DirectPlacement',
          responsePlacement: 'Embedded',
        }),
      ])
    )
    expect(completing(web).itemSource?.itemPresentations).toHaveLength(3)
    expect(
      completing(paper).gapRealizations.every(
        (gap) =>
          gap.type === 'ItemGapRealization' &&
          gap.assignmentMode === 'ItemSelection' &&
          gap.responsePlacement === 'Embedded' &&
          gap.selectionPresentation?.optionPresentations.length === 3
      )
    ).toBe(true)
  })

  it('Q5 preserves Integer=3, range 0..10, three-tone Audio Context', () => {
    const web = primary('Q5')
    expect(web.qd.responseInteractions[0]).toEqual({
      id: 'short',
      type: 'ShortInput',
      instruction: 'How many tones do you hear? Enter a whole number.',
      inputType: 'Integer',
      correctValues: [3],
      minValue: 0,
      maxValue: 10,
    })
    expect(contentText(web.qd.stimuli[0].sourceContent)).toContain(
      'exactly three clearly separated tones'
    )
    expect(web.qd.stimuli[0]).toMatchObject({
      allowedModalities: ['Audio'],
      materializationPolicy: 'Fixed',
    })
  })

  it('Q6 preserves Integer I1, bounded Essay I2, shared Video Context, and only Sequence', () => {
    const web = primary('Q6')
    expect(web.qd.responseInteractions).toEqual([
      {
        id: 'short',
        type: 'ShortInput',
        instruction: 'How many moving objects are shown in the video?',
        inputType: 'Integer',
        correctValues: [1],
      },
      {
        id: 'essay',
        type: 'Essay',
        instruction: 'In 20–50 words, describe the motion shown in the video.',
        minLength: 20,
        maxLength: 50,
        lengthUnit: 'Words',
      },
    ])
    expect(web.qd.constraints).toEqual([
      { type: 'Sequence', interactionRefs: ['short', 'essay'] },
    ])
    expect(web.qfd.interactionPrecedences).toEqual([
      { beforeInteractionRef: 'short', afterInteractionRef: 'essay' },
    ])
    expect(web.qfd.dependencyRealizations).toEqual([])
  })

  it('Q7 preserves exactly one photosynthesis concept map and channel contrast', () => {
    const web = primary('Q7')
    const paper = primary('Q7', 'ConventionalPaperProfile')
    expect(web.qd.responseInteractions[0]).toMatchObject({
      type: 'ArtifactSubmission',
      minArtifacts: 1,
      maxArtifacts: 1,
      artifactSpecification:
        'One concept map showing photosynthesis inputs, outputs, and energy flow.',
    })
    expect(web.qfd.interactionRealizations[0]).toMatchObject({
      submissionMode: 'DigitalSubmission',
    })
    expect(paper.qfd.interactionRealizations[0]).toMatchObject({
      submissionMode: 'PhysicalSubmission',
    })
  })

  it('Q8A and Q8B preserve exact marking tasks, content, modality, and Workspace binding', () => {
    const point = primary('Q8A')
    const textSpan = primary('Q8B')
    expect(point.qd.responseInteractions[0]).toMatchObject({
      type: 'Marking',
      instruction: 'Place one point inside the circle.',
      markType: 'Point',
      minMarks: 1,
      maxMarks: 1,
    })
    expect(contentText(point.qd.stimuli[0].sourceContent)).toContain(
      'triangle, circle, and square'
    )
    expect(textSpan.qd.responseInteractions[0]).toMatchObject({
      type: 'Marking',
      instruction: 'Mark the verb phrase in the sentence.',
      markType: 'TextSpan',
      minMarks: 1,
      maxMarks: 1,
    })
    expect(contentText(textSpan.qd.stimuli[0].sourceContent)).toBe(
      'The enzyme catalyzes the reaction rapidly.'
    )
    for (const testCase of [point, textSpan]) {
      expect(testCase.qd.associations[0].role).toBe('Workspace')
      expect(testCase.qfd.interactionRealizations[0]).toMatchObject({
        workspaceRealizationRef: 'q8-sr',
      })
    }
  })

  it('Q9 preserves all three Workspace Choices and Direct/Referenced anchor contrast', () => {
    const web = primary('Q9')
    const paper = primary('Q9', 'ConventionalPaperProfile')
    expect(web.qd.responseInteractions[0]).toMatchObject({
      type: 'Selecting',
      instruction: 'Select the circle.',
      minSelections: 1,
      maxSelections: 1,
      choices: [
        { id: 'triangle', isCorrect: false },
        { id: 'circle', isCorrect: true },
        { id: 'square', isCorrect: false },
      ],
    })
    expect(selecting(web).workspaceRealizations[0]).toMatchObject({
      mode: 'DirectSelection',
      choiceRealizations: [
        { choiceRef: 'triangle' },
        { choiceRef: 'circle' },
        { choiceRef: 'square' },
      ],
    })
    expect(selecting(paper).workspaceRealizations[0]).toMatchObject({
      mode: 'ReferencedSelection',
      referencedResponseSite: { id: 'q9-reference-site' },
    })
    expect(
      selecting(web).workspaceRealizations[0].choiceRealizations.every(
        ({ realizationAnchor }) =>
          realizationAnchor?.kind === 'RegionRealizationAnchor'
      )
    ).toBe(true)
  })

  it('Q10 preserves four heart labels, four gaps, usage limits, and materialization decisions', () => {
    const web = primary('Q10')
    const paper = primary('Q10', 'ConventionalPaperProfile')
    const interaction = web.qd.responseInteractions[0]
    expect(interaction).toMatchObject({
      type: 'Completing',
      instruction:
        'Complete the diagram by placing the four chamber labels in the correct positions.',
    })
    if (interaction.type !== 'Completing')
      throw new Error('Q10 is not Completing.')
    expect(interaction.completingItems.map(({ id }) => id)).toEqual([
      'left-atrium',
      'right-atrium',
      'left-ventricle',
      'right-ventricle',
    ])
    expect(
      interaction.completingItems.every(({ usageLimit }) => usageLimit === 1)
    ).toBe(true)
    expect(interaction.completingGaps).toHaveLength(4)
    expect(web.qd.stimuli[0]).toMatchObject({
      allowedModalities: ['Image'],
      materializationPolicy: 'SpecificationBased',
    })
    expect(web.qd.stimuli[0].sourceContent).toBeUndefined()
    expect(web.qfd.stimulusRealizations[0].mode).toBe(
      'MaterializeFromSpecification'
    )
    expect(
      completing(web).gapRealizations.every(
        (gap) =>
          gap.type === 'ItemGapRealization' &&
          gap.assignmentMode === 'DirectPlacement' &&
          gap.realizationAnchor?.kind === 'RegionRealizationAnchor'
      )
    ).toBe(true)
    expect(
      completing(paper).gapRealizations.every(
        (gap) =>
          gap.type === 'ItemGapRealization' &&
          gap.assignmentMode === 'ItemSelection' &&
          gap.selectionPresentation?.optionPresentations.length === 4
      )
    ).toBe(true)
  })

  it('Q11 preserves the 2019/2020/2021 bar-chart mapping and Number=60 domain', () => {
    const web = primary('Q11')
    expect(web.qd.responseInteractions[0]).toEqual({
      id: 'short',
      type: 'ShortInput',
      instruction: 'What value does the chart show for 2020?',
      inputType: 'Number',
      correctValues: [60],
    })
    expect(contentText(web.qd.stimuli[0].sourceContent)).toContain(
      '2019 → 40; 2020 → 60; 2021 → 50'
    )
    expect(web.qd.stimuli[0]).toMatchObject({
      allowedModalities: ['Image'],
      materializationPolicy: 'Adaptable',
    })
    expect(web.qd.stimuli[0].contentSpecification).toContain(
      'year-value mapping'
    )
    expect(web.qfd.stimulusRealizations[0]).toMatchObject({
      mode: 'AdaptContent',
      realizedModality: 'Image',
    })
  })

  it('Q12 preserves I1/I2/I3 content and keeps Dependency separate from Sequence', () => {
    const web = primary('Q12')
    expect(web.qd.responseInteractions).toEqual([
      {
        id: 'i1',
        type: 'ShortInput',
        instruction: 'What is 2 + 3?',
        inputType: 'Integer',
        correctValues: [5],
      },
      {
        id: 'i2',
        type: 'Selecting',
        instruction: 'Select the even number.',
        minSelections: 1,
        maxSelections: 1,
        standaloneChoiceOrderPolicy: 'Permutable',
        choices: [
          { id: '3', semanticContent: '3', isCorrect: false },
          { id: '4', semanticContent: '4', isCorrect: true },
          { id: '5', semanticContent: '5', isCorrect: false },
        ],
      },
      {
        id: 'i3',
        type: 'Essay',
        instruction: 'Briefly explain how you identified the even number.',
      },
    ])
    expect(web.qd.constraints).toEqual([
      {
        type: 'Dependency',
        predecessorInteractionRef: 'i1',
        successorInteractionRef: 'i2',
        rule: 'RequiresCorrectness',
        exposurePolicy: 'ConcealedUntilSatisfied',
        strength: 'Required',
      },
      { type: 'Sequence', interactionRefs: ['i2', 'i3'] },
    ])
    expect(web.qfd.interactionPrecedences).toEqual([
      { beforeInteractionRef: 'i2', afterInteractionRef: 'i3' },
    ])
    expect(web.qfd.dependencyRealizations).toEqual([
      {
        predecessorInteractionRef: 'i1',
        successorInteractionRef: 'i2',
        rule: 'RequiresCorrectness',
        exposurePolicy: 'ConcealedUntilSatisfied',
      },
    ])
  })
})

describe('B01–B12 controlled-change contracts', () => {
  it('B01 changes only Q1 cardinality while Helium and Neon remain correct', () => {
    const baseline = primary('Q1')
    const changed = structuredClone(boundary('B01').qd)
    const interaction = changed.responseInteractions[0]
    expect(interaction).toMatchObject({ minSelections: 1, maxSelections: 1 })
    if (interaction.type !== 'Selecting')
      throw new Error('B01 is not Selecting.')
    expect(
      interaction.choices
        .filter(({ isCorrect }) => isCorrect)
        .map(({ id }) => id)
    ).toEqual(['he', 'ne'])
    interaction.minSelections = 2
    interaction.maxSelections = 2
    expect(changed).toEqual(baseline.qd)
  })

  it('B02 changes only the correctness dependency predecessor to Essay I3', () => {
    const baseline = primary('Q12')
    const changed = structuredClone(boundary('B02').qd)
    const changedDependency = changed.constraints.find(
      (candidate): candidate is DependencyConstraint =>
        candidate.type === 'Dependency'
    )!
    expect(changedDependency.predecessorInteractionRef).toBe('i3')
    expect(
      changed.responseInteractions.find(({ id }) => id === 'i3')?.type
    ).toBe('Essay')
    changedDependency.predecessorInteractionRef = 'i1'
    expect(changed).toEqual(baseline.qd)
  })

  it('B03 adds only a duplicate InteractionRealization', () => {
    const baseline = primary('Q1')
    const changed = structuredClone(boundary('B03').qfd)
    expect(changed.interactionRealizations).toHaveLength(2)
    expect(changed.interactionRealizations[1]).toEqual(
      changed.interactionRealizations[0]
    )
    changed.interactionRealizations.pop()
    expect(changed).toEqual(baseline.qfd)
  })

  it('B04 removes only the Q6 Essay association while its SR still serves Essay', () => {
    const baseline = primary('Q6')
    const changed = structuredClone(boundary('B04').qd)
    expect(changed.associations).toEqual([
      { interactionRef: 'short', stimulusRef: 'q6-video', role: 'Context' },
    ])
    expect(boundary('B04').qfd).toEqual(baseline.qfd)
    expect(
      boundary('B04').qfd.stimulusRealizations[0].servedInteractionRefs
    ).toEqual(['short', 'essay'])
    changed.associations.push({
      interactionRef: 'essay',
      stimulusRef: 'q6-video',
      role: 'Context',
    })
    expect(changed).toEqual(baseline.qd)
  })

  it('B05 changes only Q2 Paper mode to unsupported DirectOrdering', () => {
    const baseline = primary('Q2', 'ConventionalPaperProfile')
    const changed = structuredClone(boundary('B05').qfd)
    expect(ordering(boundary('B05')).mode).toBe('DirectOrdering')
    const realization = changed.interactionRealizations[0]
    if (realization.type !== 'OrderingRealization')
      throw new Error('B05 is not Ordering.')
    realization.mode = 'OrderNotation'
    expect(changed).toEqual(baseline.qfd)
  })

  it('B06 changes only Q5 realized modality from Audio to Image', () => {
    const baseline = primary('Q5')
    const changed = structuredClone(boundary('B06').qfd)
    expect(changed.stimulusRealizations[0].realizedModality).toBe('Image')
    changed.stimulusRealizations[0].realizedModality = 'Audio'
    expect(changed).toEqual(baseline.qfd)
  })

  it('B07 changes D1 to Preferred and omits only its realization', () => {
    const baseline = primary('Q12', 'ConventionalPaperProfile')
    const changed = structuredClone(boundary('B07').qd)
    const changedDependency = changed.constraints.find(
      (candidate): candidate is DependencyConstraint =>
        candidate.type === 'Dependency'
    )!
    expect(changedDependency.strength).toBe('Preferred')
    expect(boundary('B07').qfd.dependencyRealizations).toEqual([])
    changedDependency.strength = 'Required'
    expect(changed).toEqual(baseline.qd)
    expect({
      ...boundary('B07').qfd,
      dependencyRealizations: baseline.qfd.dependencyRealizations,
    }).toEqual(baseline.qfd)
  })

  it('B08 changes only D1 strength to Preferred while Paper still realizes it', () => {
    const baseline = primary('Q12', 'ConventionalPaperProfile')
    const changed = structuredClone(boundary('B08').qd)
    const changedDependency = changed.constraints.find(
      (candidate): candidate is DependencyConstraint =>
        candidate.type === 'Dependency'
    )!
    expect(changedDependency.strength).toBe('Preferred')
    expect(boundary('B08').qfd).toEqual(baseline.qfd)
    changedDependency.strength = 'Required'
    expect(changed).toEqual(baseline.qd)
  })

  it('B09 changes only Q3 Fixed source presentation order', () => {
    const baseline = primary('Q3')
    const changed = structuredClone(boundary('B09').qfd)
    const changedRelation = changed.interactionRealizations[0]
    if (changedRelation.type !== 'RelatingRealization')
      throw new Error('B09 is not Relating.')
    const layout = changedRelation.sourceSetPresentation.localLayout
    if (layout.kind !== 'LayoutGroup')
      throw new Error('B09 lacks source layout.')
    expect(
      layout.children.map((child) =>
        child.kind === 'LayoutPlacement' ? child.realizationRef.id : undefined
      )
    ).toEqual([
      'rel-spain-source-p',
      'rel-italy-source-p',
      'rel-france-source-p',
    ])
    layout.children.reverse()
    expect(changed).toEqual(baseline.qfd)
  })

  it('B10 changes only Q1 TaskInstruction realizedText', () => {
    const baseline = primary('Q1')
    const changedCase = boundary('B10')
    expect(changedCase.qd).toEqual(baseline.qd)
    const changed = structuredClone(changedCase.qfd)
    expect(
      changed.interactionRealizations[0].instructionRealizations[0].realizedText
    ).toBeTruthy()
    delete changed.interactionRealizations[0].instructionRealizations[0]
      .realizedText
    expect(changed).toEqual(baseline.qfd)
  })

  it('B11 adds exactly one second PreserveContent SR and required root placement', () => {
    const baseline = primary('Q3')
    const changed = boundary('B11')
    expect(changed.qd).toEqual(baseline.qd)
    expect(changed.qfd.stimulusRealizations).toHaveLength(2)
    expect(changed.qfd.stimulusRealizations[1]).toEqual({
      ...changed.qfd.stimulusRealizations[0],
      id: 'q3-sr-second',
    })
    expect(changed.qfd.rootLayout).toMatchObject({
      kind: 'LayoutGroup',
      children: expect.arrayContaining([
        {
          kind: 'LayoutPlacement',
          realizationRef: {
            kind: 'StimulusRealization',
            id: 'q3-sr-second',
          },
        },
      ]),
    })
  })

  it('B12-P/B12-N share identical scientific models and differ only in external exposure evidence', () => {
    const positive = boundary('B12-P')
    const negative = boundary('B12-N')
    expect(positive.qd).toEqual(negative.qd)
    expect(positive.qfd).toEqual(negative.qfd)
    expect(positive.profile).toEqual(negative.profile)
    expect(positive.qfd.stimulusRealizations[0]).toMatchObject({
      stimulusRef: 'shared',
      servedInteractionRefs: ['a', 'b'],
    })
    expect(
      positive.options?.conformanceEvidence?.verifiedConcealedDependencyKeys
        ?.size
    ).toBe(1)
    expect(
      negative.options?.conformanceEvidence?.prematurelyExposedDependencyKeys
        ?.size
    ).toBe(1)
  })
})

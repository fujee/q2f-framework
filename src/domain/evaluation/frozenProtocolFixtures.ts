import { referenceContentCarrier } from '../qd/implementation/contentCarrier'
import type {
  DependencyConstraint,
  QuestionDefinition,
  ResponseInteraction,
  Stimulus,
} from '../qd/model'
import type { ConformanceEvidence } from '../qfd/conformance/evidence'
import { dependencyEvidenceKey } from '../qfd/conformance/evidence'
import type {
  CompletingRealization,
  ElementPresentation,
  InteractionRealization,
  LayoutElement,
  LayoutableRealizationKind,
  QuestionFormDefinition,
  ResponseElementRef,
  StimulusRealization,
} from '../qfd/model'
import type { QuestionFormProfile } from '../qfd/profiles/model'
import {
  CONVENTIONAL_PAPER_PROFILE,
  INTERACTIVE_WEB_PROFILE,
} from '../qfd/profiles/registry'
import type { EvaluationOptions, ExpectedAggregates } from './pipeline'

export interface FrozenEvaluationCase {
  id: string
  qd: QuestionDefinition
  qfd: QuestionFormDefinition
  profile: QuestionFormProfile
  expected: Required<ExpectedAggregates>
  options?: EvaluationOptions
}

const PASS: Required<ExpectedAggregates> = {
  qdValidation: 'PASS',
  qfdValidation: 'PASS',
  feasibility: 'FEASIBLE',
  conformance: 'CONFORMANT',
}

function qd(
  id: string,
  responseInteractions: ResponseInteraction[],
  stimuli: Stimulus[] = [],
  associations: QuestionDefinition['associations'] = [],
  constraints: QuestionDefinition['constraints'] = []
): QuestionDefinition {
  return { id, responseInteractions, stimuli, associations, constraints }
}

function element(
  id: string,
  elementRef: ResponseElementRef
): ElementPresentation {
  return { id, elementRef }
}

function placement(kind: LayoutableRealizationKind, id: string): LayoutElement {
  return { kind: 'LayoutPlacement', realizationRef: { kind, id } }
}

function group(ids: string[]): LayoutElement {
  return {
    kind: 'LayoutGroup',
    orientation: 'Horizontal',
    children: ids.map((id) => placement('ElementPresentation', id)),
  }
}

function buildQfd(
  question: QuestionDefinition,
  profile: QuestionFormProfile,
  interactionRealizations: InteractionRealization[],
  stimulusRealizations: StimulusRealization[] = [],
  interactionPrecedences: QuestionFormDefinition['interactionPrecedences'] = [],
  dependencyRealizations: QuestionFormDefinition['dependencyRealizations'] = []
): QuestionFormDefinition {
  const form: QuestionFormDefinition = {
    questionDefinitionRef: question.id,
    targetProfileRef: profile.id,
    interactionRealizations,
    stimulusRealizations,
    interactionPrecedences,
    dependencyRealizations,
    rootLayout: { kind: 'LayoutGroup', orientation: 'Vertical', children: [] },
  }
  form.rootLayout = {
    kind: 'LayoutGroup',
    orientation: 'Vertical',
    children: collectOuterPlacements(form),
  }
  return form
}

function collectOuterPlacements(form: QuestionFormDefinition): LayoutElement[] {
  const result = form.stimulusRealizations.map(({ id }) =>
    placement('StimulusRealization', id)
  )
  for (const realization of form.interactionRealizations) {
    result.push(
      ...realization.instructionRealizations.map(({ id }) =>
        placement('InstructionRealization', id)
      )
    )
    switch (realization.type) {
      case 'SelectingRealization':
        if (realization.standaloneSelection)
          result.push(
            placement(
              'SelectionPresentation',
              realization.standaloneSelection.id
            )
          )
        realization.workspaceRealizations.forEach((workspace) => {
          if (workspace.referencedResponseSite)
            result.push(
              placement(
                'ResponseSiteRealization',
                workspace.referencedResponseSite.id
              )
            )
        })
        break
      case 'OrderingRealization':
        result.push(
          placement('OrderingPresentation', realization.presentation.id)
        )
        break
      case 'RelatingRealization':
        result.push(
          placement(
            'RelatingSetPresentation',
            realization.sourceSetPresentation.id
          ),
          placement(
            'RelatingSetPresentation',
            realization.targetSetPresentation.id
          )
        )
        if (realization.notationResponseSite)
          result.push(
            placement(
              'ResponseSiteRealization',
              realization.notationResponseSite.id
            )
          )
        break
      case 'CompletingRealization':
        if (realization.itemSource)
          result.push(
            placement(
              'CompletingItemSourceRealization',
              realization.itemSource.id
            )
          )
        realization.gapRealizations.forEach((gap) => {
          if (
            gap.type === 'InputGapRealization' &&
            gap.responsePlacement === 'Referenced'
          )
            result.push(
              placement('ResponseSiteRealization', gap.responseSite.id)
            )
          if (
            gap.type === 'ItemGapRealization' &&
            gap.assignmentMode === 'ItemSelection' &&
            gap.responsePlacement === 'Referenced' &&
            gap.selectionPresentation
          )
            result.push(
              placement('SelectionPresentation', gap.selectionPresentation.id)
            )
          if (
            gap.type === 'ItemGapRealization' &&
            gap.assignmentMode === 'DirectPlacement' &&
            gap.referencedPlacementSite
          )
            result.push(
              placement(
                'ResponseSiteRealization',
                gap.referencedPlacementSite.id
              )
            )
        })
        break
      case 'ShortInputRealization':
      case 'EssayRealization':
        result.push(
          placement('ResponseSiteRealization', realization.responseSite.id)
        )
        break
      case 'ArtifactSubmissionRealization':
        result.push(
          placement('ResponseSiteRealization', realization.submissionSite.id)
        )
        break
      case 'MarkingRealization':
        break
    }
  }
  return result
}

function selecting(
  interactionRef: string,
  choiceIds: string[],
  mode: 'Expanded' | 'Collapsed'
): InteractionRealization {
  const presentations = choiceIds.map((choiceRef) =>
    element(`${interactionRef}-${choiceRef}-p`, {
      kind: 'Choice',
      interactionRef,
      choiceRef,
    })
  )
  return {
    type: 'SelectingRealization',
    interactionRef,
    instructionRealizations: [],
    standaloneSelection: {
      id: `${interactionRef}-selection`,
      mode,
      optionPresentations: presentations,
      localLayout: group(presentations.map(({ id }) => id)),
    },
    workspaceRealizations: [],
  }
}

function ordering(
  interactionRef: string,
  itemIds: string[],
  mode: 'DirectOrdering' | 'OrderNotation'
): InteractionRealization {
  const presentations = itemIds.map((orderingItemRef) =>
    element(`${interactionRef}-${orderingItemRef}-p`, {
      kind: 'OrderingItem',
      interactionRef,
      orderingItemRef,
    })
  )
  return {
    type: 'OrderingRealization',
    interactionRef,
    instructionRealizations: [],
    mode,
    presentation: {
      id: `${interactionRef}-ordering`,
      itemPresentations: presentations,
      localLayout: group(presentations.map(({ id }) => id)),
    },
  }
}

function relating(
  mode: 'DirectRelationConstruction' | 'RelationNotation'
): InteractionRealization {
  const source = ['country-a', 'country-b'].map((relatingElementRef) =>
    element(`rel-${relatingElementRef}-source-p`, {
      kind: 'RelatingElement',
      interactionRef: 'rel',
      set: 'Source',
      relatingElementRef,
    })
  )
  const target = ['capital-a', 'capital-b'].map((relatingElementRef) =>
    element(`rel-${relatingElementRef}-target-p`, {
      kind: 'RelatingElement',
      interactionRef: 'rel',
      set: 'Target',
      relatingElementRef,
    })
  )
  return {
    type: 'RelatingRealization',
    interactionRef: 'rel',
    instructionRealizations: [],
    mode,
    sourceSetPresentation: {
      id: 'rel-source',
      elementPresentations: source,
      localLayout: group(source.map(({ id }) => id)),
    },
    targetSetPresentation: {
      id: 'rel-target',
      elementPresentations: target,
      localLayout: group(target.map(({ id }) => id)),
    },
    ...(mode === 'RelationNotation'
      ? { notationResponseSite: { id: 'rel-notation-site' } }
      : {}),
  }
}

function scalar(interactionRef: string): InteractionRealization {
  return {
    type: 'ShortInputRealization',
    interactionRef,
    instructionRealizations: [],
    responseSite: { id: `${interactionRef}-site` },
  }
}

function essay(interactionRef: string): InteractionRealization {
  return {
    type: 'EssayRealization',
    interactionRef,
    instructionRealizations: [],
    responseSite: { id: `${interactionRef}-site` },
  }
}

function stimulusRealization(
  id: string,
  stimulusRef: string,
  servedInteractionRefs: string[],
  realizedModality: StimulusRealization['realizedModality'],
  mode: StimulusRealization['mode'] = 'PreserveContent',
  realizedContent?: StimulusRealization['realizedContent']
): StimulusRealization {
  return {
    id,
    stimulusRef,
    servedInteractionRefs,
    realizedModality,
    mode,
    ...(realizedContent === undefined ? {} : { realizedContent }),
  }
}

function directReuse(...ids: string[]): ConformanceEvidence {
  return { directSourceReuseStimulusRealizationIds: new Set(ids) }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function makeQ1(profile: QuestionFormProfile): FrozenEvaluationCase {
  const question = qd('q1', [
    {
      id: 'select',
      type: 'Selecting',
      minSelections: 1,
      maxSelections: 1,
      standaloneChoiceOrderPolicy: 'Permutable',
      choices: [
        { id: 'a', semanticContent: 'Alpha', isCorrect: true },
        { id: 'b', semanticContent: 'Beta', isCorrect: false },
      ],
    },
  ])
  const mode = profile === INTERACTIVE_WEB_PROFILE ? 'Collapsed' : 'Expanded'
  return {
    id: `Q1-${profile.id}`,
    qd: question,
    qfd: buildQfd(question, profile, [selecting('select', ['a', 'b'], mode)]),
    profile,
    expected: PASS,
  }
}

function makeQ2(profile: QuestionFormProfile): FrozenEvaluationCase {
  const question = qd('q2', [
    {
      id: 'order',
      type: 'Ordering',
      itemOrderPolicy: 'Permutable',
      orderingItems: [
        { id: 'first', semanticContent: 'First' },
        { id: 'second', semanticContent: 'Second' },
        { id: 'third', semanticContent: 'Third' },
      ],
      correctOrder: ['first', 'second', 'third'],
    },
  ])
  const mode =
    profile === INTERACTIVE_WEB_PROFILE ? 'DirectOrdering' : 'OrderNotation'
  return {
    id: `Q2-${profile.id}`,
    qd: question,
    qfd: buildQfd(question, profile, [
      ordering('order', ['first', 'second', 'third'], mode),
    ]),
    profile,
    expected: PASS,
  }
}

function makeQ3(profile: QuestionFormProfile): FrozenEvaluationCase {
  const question = qd(
    'q3',
    [
      {
        id: 'rel',
        type: 'Relating',
        mappingType: 'OneToOne',
        sourceParticipationPolicy: 'Required',
        sourceSet: {
          label: 'Countries',
          elementOrderPolicy: 'Fixed',
          relatingElements: [
            { id: 'country-a', semanticContent: 'Country A' },
            { id: 'country-b', semanticContent: 'Country B' },
          ],
        },
        targetSet: {
          label: 'Capitals',
          elementOrderPolicy: 'Fixed',
          relatingElements: [
            { id: 'capital-a', semanticContent: 'Capital A' },
            { id: 'capital-b', semanticContent: 'Capital B' },
          ],
        },
        correctRelations: [
          { sourceElementRef: 'country-a', targetElementRef: 'capital-a' },
          { sourceElementRef: 'country-b', targetElementRef: 'capital-b' },
        ],
      },
    ],
    [
      {
        id: 'q3-text',
        sourceContent: referenceContentCarrier('Reference passage.', {
          text: true,
        }),
        allowedModalities: ['Text'],
        materializationPolicy: 'Fixed',
      },
    ],
    [{ interactionRef: 'rel', stimulusRef: 'q3-text', role: 'Context' }]
  )
  const mode =
    profile === INTERACTIVE_WEB_PROFILE
      ? 'DirectRelationConstruction'
      : 'RelationNotation'
  const evidence: ConformanceEvidence = {
    ...directReuse('q3-sr'),
    ...(mode === 'RelationNotation'
      ? { trustedRelationNotationInteractionRefs: new Set(['rel']) }
      : {}),
  }
  return {
    id: `Q3-${profile.id}`,
    qd: question,
    qfd: buildQfd(
      question,
      profile,
      [relating(mode)],
      [stimulusRealization('q3-sr', 'q3-text', ['rel'], 'Text')]
    ),
    profile,
    expected: PASS,
    options: { conformanceEvidence: evidence },
  }
}

function completingRealization(
  mode: 'DirectPlacement' | 'ItemSelection',
  stimulusRef = 'q4-sr',
  gapIds = ['gap-a', 'gap-b'],
  withRealizationAnchors = false
): CompletingRealization {
  const gapRealizations = gapIds.map((gapRef) => {
    if (mode === 'DirectPlacement')
      return {
        type: 'ItemGapRealization' as const,
        gapRef,
        stimulusRealizationRef: stimulusRef,
        responsePlacement: 'Embedded' as const,
        assignmentMode: 'DirectPlacement' as const,
        ...(withRealizationAnchors
          ? {
              realizationAnchor: {
                kind: 'RegionRealizationAnchor' as const,
                payload: { implementationLocator: gapRef },
              },
            }
          : {}),
      }
    const options = ['item-a', 'item-b'].map((completingItemRef) =>
      element(`${gapRef}-${completingItemRef}-p`, {
        kind: 'CompletingItem',
        interactionRef: 'complete',
        completingItemRef,
      })
    )
    return {
      type: 'ItemGapRealization' as const,
      gapRef,
      stimulusRealizationRef: stimulusRef,
      responsePlacement: 'Embedded' as const,
      assignmentMode: 'ItemSelection' as const,
      ...(withRealizationAnchors
        ? {
            realizationAnchor: {
              kind: 'RegionRealizationAnchor' as const,
              payload: { implementationLocator: gapRef },
            },
          }
        : {}),
      selectionPresentation: {
        id: `${gapRef}-selection`,
        mode: 'Expanded' as const,
        optionPresentations: options,
        localLayout: group(options.map(({ id }) => id)),
      },
    }
  })
  const source = ['item-a', 'item-b'].map((completingItemRef) =>
    element(`source-${completingItemRef}-p`, {
      kind: 'CompletingItem',
      interactionRef: 'complete',
      completingItemRef,
    })
  )
  return {
    type: 'CompletingRealization',
    interactionRef: 'complete',
    instructionRealizations: [],
    gapRealizations,
    ...(mode === 'DirectPlacement'
      ? {
          itemSource: {
            id: 'complete-item-source',
            itemPresentations: source,
            localLayout: group(source.map(({ id }) => id)),
          },
        }
      : {}),
  }
}

function makeQ4(profile: QuestionFormProfile): FrozenEvaluationCase {
  const question = qd(
    'q4',
    [
      {
        id: 'complete',
        type: 'Completing',
        completingItems: [
          { id: 'item-a', semanticContent: 'Alpha', usageLimit: 1 },
          { id: 'item-b', semanticContent: 'Beta', usageLimit: 1 },
        ],
        completingGaps: ['gap-a', 'gap-b'].map((id) => ({
          id,
          type: 'ItemGap' as const,
          workspaceStimulusRef: 'q4-text',
          sourceAnchor: {
            kind: 'TextAnchor' as const,
            payload: { implementationLocator: `[${id}]` },
          },
          correctItemRefs: [id === 'gap-a' ? 'item-a' : 'item-b'],
        })),
      },
    ],
    [
      {
        id: 'q4-text',
        sourceContent: referenceContentCarrier('[gap-a] then [gap-b]', {
          text: true,
        }),
        allowedModalities: ['Text'],
        materializationPolicy: 'Fixed',
      },
    ],
    [{ interactionRef: 'complete', stimulusRef: 'q4-text', role: 'Workspace' }]
  )
  const mode =
    profile === INTERACTIVE_WEB_PROFILE ? 'DirectPlacement' : 'ItemSelection'
  return {
    id: `Q4-${profile.id}`,
    qd: question,
    qfd: buildQfd(
      question,
      profile,
      [completingRealization(mode)],
      [stimulusRealization('q4-sr', 'q4-text', ['complete'], 'Text')]
    ),
    profile,
    expected: PASS,
    options: { conformanceEvidence: directReuse('q4-sr') },
  }
}

function makeQ5(profile: QuestionFormProfile): FrozenEvaluationCase {
  const question = qd(
    'q5',
    [
      {
        id: 'short',
        type: 'ShortInput',
        inputType: 'Integer',
        correctValues: [42],
      },
    ],
    [
      {
        id: 'q5-audio',
        sourceContent: 'audio://frozen-q5',
        allowedModalities: ['Audio'],
        materializationPolicy: 'Fixed',
      },
    ],
    [{ interactionRef: 'short', stimulusRef: 'q5-audio', role: 'Context' }]
  )
  return {
    id: `Q5-${profile.id}`,
    qd: question,
    qfd: buildQfd(
      question,
      profile,
      [scalar('short')],
      [stimulusRealization('q5-sr', 'q5-audio', ['short'], 'Audio')]
    ),
    profile,
    expected: {
      ...PASS,
      feasibility:
        profile === INTERACTIVE_WEB_PROFILE ? 'FEASIBLE' : 'INFEASIBLE',
    },
    options: { conformanceEvidence: directReuse('q5-sr') },
  }
}

function makeQ6(profile: QuestionFormProfile): FrozenEvaluationCase {
  const question = qd(
    'q6',
    [
      {
        id: 'short',
        type: 'ShortInput',
        inputType: 'Text',
        correctValues: ['observation'],
        caseSensitive: false,
      },
      { id: 'essay', type: 'Essay', minLength: 20, lengthUnit: 'Words' },
    ],
    [
      {
        id: 'q6-video',
        sourceContent: 'video://frozen-q6',
        allowedModalities: ['Video'],
        materializationPolicy: 'Fixed',
      },
    ],
    [
      { interactionRef: 'short', stimulusRef: 'q6-video', role: 'Context' },
      { interactionRef: 'essay', stimulusRef: 'q6-video', role: 'Context' },
    ],
    [{ type: 'Sequence', interactionRefs: ['short', 'essay'] }]
  )
  return {
    id: `Q6-${profile.id}`,
    qd: question,
    qfd: buildQfd(
      question,
      profile,
      [scalar('short'), essay('essay')],
      [stimulusRealization('q6-sr', 'q6-video', ['short', 'essay'], 'Video')],
      [{ beforeInteractionRef: 'short', afterInteractionRef: 'essay' }]
    ),
    profile,
    expected: {
      ...PASS,
      feasibility:
        profile === INTERACTIVE_WEB_PROFILE ? 'FEASIBLE' : 'INFEASIBLE',
    },
    options: { conformanceEvidence: directReuse('q6-sr') },
  }
}

function makeQ7(profile: QuestionFormProfile): FrozenEvaluationCase {
  const question = qd('q7', [
    {
      id: 'artifact',
      type: 'ArtifactSubmission',
      minArtifacts: 1,
      maxArtifacts: 2,
      artifactSpecification: 'Submit the completed design artifact.',
    },
  ])
  return {
    id: `Q7-${profile.id}`,
    qd: question,
    qfd: buildQfd(question, profile, [
      {
        type: 'ArtifactSubmissionRealization',
        interactionRef: 'artifact',
        instructionRealizations: [],
        submissionMode:
          profile === INTERACTIVE_WEB_PROFILE
            ? 'DigitalSubmission'
            : 'PhysicalSubmission',
        submissionSite: { id: 'artifact-site' },
      },
    ]),
    profile,
    expected: PASS,
    options: {
      conformanceEvidence: {
        trustedArtifactInteractionRefs: new Set(['artifact']),
      },
    },
  }
}

function makeQ8(
  profile: QuestionFormProfile,
  variant: 'A' | 'B'
): FrozenEvaluationCase {
  const image = variant === 'A'
  const question = qd(
    `q8${variant.toLowerCase()}`,
    [
      {
        id: 'mark',
        type: 'Marking',
        markType: image ? 'Point' : 'TextSpan',
        minMarks: 1,
        maxMarks: 1,
      },
    ],
    [
      {
        id: 'q8-workspace',
        sourceContent: image
          ? referenceContentCarrier('/frozen/q8.png', { region: true })
          : referenceContentCarrier('Frozen text passage.', { text: true }),
        allowedModalities: [image ? 'Image' : 'Text'],
        materializationPolicy: 'Fixed',
      },
    ],
    [{ interactionRef: 'mark', stimulusRef: 'q8-workspace', role: 'Workspace' }]
  )
  return {
    id: `Q8${variant}-${profile.id}`,
    qd: question,
    qfd: buildQfd(
      question,
      profile,
      [
        {
          type: 'MarkingRealization',
          interactionRef: 'mark',
          instructionRealizations: [],
          workspaceRealizationRef: 'q8-sr',
        },
      ],
      [
        stimulusRealization(
          'q8-sr',
          'q8-workspace',
          ['mark'],
          image ? 'Image' : 'Text'
        ),
      ]
    ),
    profile,
    expected: PASS,
    options: { conformanceEvidence: directReuse('q8-sr') },
  }
}

function makeQ9(profile: QuestionFormProfile): FrozenEvaluationCase {
  const question = qd(
    'q9',
    [
      {
        id: 'select',
        type: 'Selecting',
        minSelections: 1,
        maxSelections: 1,
        choices: ['left', 'right'].map((id, index) => ({
          id,
          semanticContent: id,
          isCorrect: index === 0,
          workspaceStimulusRef: 'q9-image',
          placementSpecification: `${id} region`,
        })),
      },
    ],
    [
      {
        id: 'q9-image',
        sourceContent: referenceContentCarrier('/frozen/q9.png', {
          region: true,
        }),
        allowedModalities: ['Image'],
        materializationPolicy: 'Fixed',
      },
    ],
    [{ interactionRef: 'select', stimulusRef: 'q9-image', role: 'Workspace' }]
  )
  const referenced = profile === CONVENTIONAL_PAPER_PROFILE
  const form = buildQfd(
    question,
    profile,
    [
      {
        type: 'SelectingRealization',
        interactionRef: 'select',
        instructionRealizations: [],
        workspaceRealizations: [
          {
            stimulusRealizationRef: 'q9-sr',
            mode: referenced ? 'ReferencedSelection' : 'DirectSelection',
            choiceRealizations: ['left', 'right'].map((choiceRef) => ({
              choiceRef,
              realizationAnchor: {
                kind: 'RegionRealizationAnchor' as const,
                payload: { implementationLocator: choiceRef },
              },
            })),
            ...(referenced
              ? { referencedResponseSite: { id: 'q9-reference-site' } }
              : {}),
          },
        ],
      },
    ],
    [stimulusRealization('q9-sr', 'q9-image', ['select'], 'Image')]
  )
  return {
    id: `Q9-${profile.id}`,
    qd: question,
    qfd: form,
    profile,
    expected: { ...PASS, conformance: 'REVIEW_REQUIRED' },
    options: {
      conformanceEvidence: {
        ...directReuse('q9-sr'),
        ...(referenced
          ? { trustedReferencedSelectionInteractionRefs: new Set(['select']) }
          : {}),
      },
    },
  }
}

function makeQ10(profile: QuestionFormProfile): FrozenEvaluationCase {
  const question = qd(
    'q10',
    [
      {
        id: 'complete',
        type: 'Completing',
        completingItems: [
          { id: 'item-a', semanticContent: 'Atrium' },
          { id: 'item-b', semanticContent: 'Ventricle' },
        ],
        completingGaps: ['gap-a', 'gap-b'].map((id) => ({
          id,
          type: 'ItemGap' as const,
          workspaceStimulusRef: 'q10-spec',
          placementSpecification: `${id} anatomical region`,
          correctItemRefs: [id === 'gap-a' ? 'item-a' : 'item-b'],
        })),
      },
    ],
    [
      {
        id: 'q10-spec',
        allowedModalities: ['Image'],
        materializationPolicy: 'SpecificationBased',
        contentSpecification: 'A labelled heart diagram without answers.',
      },
    ],
    [{ interactionRef: 'complete', stimulusRef: 'q10-spec', role: 'Workspace' }]
  )
  const mode =
    profile === INTERACTIVE_WEB_PROFILE ? 'DirectPlacement' : 'ItemSelection'
  return {
    id: `Q10-${profile.id}`,
    qd: question,
    qfd: buildQfd(
      question,
      profile,
      [completingRealization(mode, 'q10-sr', ['gap-a', 'gap-b'], true)],
      [
        stimulusRealization(
          'q10-sr',
          'q10-spec',
          ['complete'],
          'Image',
          'MaterializeFromSpecification',
          referenceContentCarrier('/frozen/q10.png', { region: true })
        ),
      ]
    ),
    profile,
    expected: { ...PASS, conformance: 'REVIEW_REQUIRED' },
  }
}

function makeQ11(profile: QuestionFormProfile): FrozenEvaluationCase {
  const question = qd(
    'q11',
    [
      {
        id: 'short',
        type: 'ShortInput',
        inputType: 'Text',
        correctValues: ['adapted'],
        caseSensitive: false,
      },
    ],
    [
      {
        id: 'q11-image',
        sourceContent: referenceContentCarrier('/frozen/q11-source.png', {
          region: true,
        }),
        allowedModalities: ['Image'],
        materializationPolicy: 'Adaptable',
        contentSpecification: 'Preserve the response-relevant image meaning.',
      },
    ],
    [{ interactionRef: 'short', stimulusRef: 'q11-image', role: 'Context' }]
  )
  return {
    id: `Q11-${profile.id}`,
    qd: question,
    qfd: buildQfd(
      question,
      profile,
      [scalar('short')],
      [
        stimulusRealization(
          'q11-sr',
          'q11-image',
          ['short'],
          'Image',
          'AdaptContent',
          referenceContentCarrier('/frozen/q11-adapted.png', { region: true })
        ),
      ]
    ),
    profile,
    expected: { ...PASS, conformance: 'REVIEW_REQUIRED' },
  }
}

function q12Dependency(
  strength: 'Required' | 'Preferred'
): DependencyConstraint {
  return {
    type: 'Dependency',
    predecessorInteractionRef: 'i1',
    successorInteractionRef: 'i2',
    rule: 'RequiresCorrectness',
    exposurePolicy: 'ConcealedUntilSatisfied',
    strength,
  }
}

function makeQ12(
  profile: QuestionFormProfile,
  strength: 'Required' | 'Preferred' = 'Required',
  realizeDependency = true
): FrozenEvaluationCase {
  const dependency = q12Dependency(strength)
  const question = qd(
    'q12',
    [
      {
        id: 'i1',
        type: 'ShortInput',
        inputType: 'Integer',
        correctValues: [1],
      },
      {
        id: 'i2',
        type: 'Selecting',
        minSelections: 1,
        maxSelections: 1,
        standaloneChoiceOrderPolicy: 'Permutable',
        choices: [
          { id: 'yes', semanticContent: 'Yes', isCorrect: true },
          { id: 'no', semanticContent: 'No', isCorrect: false },
        ],
      },
      { id: 'i3', type: 'Essay', minLength: 10, lengthUnit: 'Words' },
    ],
    [],
    [],
    [dependency, { type: 'Sequence', interactionRefs: ['i2', 'i3'] }]
  )
  const qfdDependency = {
    predecessorInteractionRef: 'i1',
    successorInteractionRef: 'i2',
    rule: 'RequiresCorrectness' as const,
    exposurePolicy: 'ConcealedUntilSatisfied' as const,
  }
  const omittedPreferred = strength === 'Preferred' && !realizeDependency
  return {
    id: `Q12-${profile.id}-${strength}-${realizeDependency ? 'realized' : 'omitted'}`,
    qd: question,
    qfd: buildQfd(
      question,
      profile,
      [scalar('i1'), selecting('i2', ['yes', 'no'], 'Expanded'), essay('i3')],
      [],
      [{ beforeInteractionRef: 'i2', afterInteractionRef: 'i3' }],
      realizeDependency ? [qfdDependency] : []
    ),
    profile,
    expected: {
      ...PASS,
      feasibility:
        profile === CONVENTIONAL_PAPER_PROFILE
          ? omittedPreferred
            ? 'FEASIBLE_WITH_WARNINGS'
            : 'INFEASIBLE'
          : 'FEASIBLE',
      conformance: omittedPreferred ? 'CONFORMANT_WITH_WARNINGS' : 'CONFORMANT',
    },
  }
}

function makeB12(negative: boolean): FrozenEvaluationCase {
  const dependency: DependencyConstraint = {
    type: 'Dependency',
    predecessorInteractionRef: 'a',
    successorInteractionRef: 'b',
    rule: 'RequiresCompletion',
    exposurePolicy: 'ConcealedUntilSatisfied',
    strength: 'Required',
  }
  const question = qd(
    'b12',
    [
      {
        id: 'a',
        type: 'Selecting',
        minSelections: 1,
        maxSelections: 1,
        standaloneChoiceOrderPolicy: 'Permutable',
        choices: [
          { id: 'a1', semanticContent: 'A1', isCorrect: true },
          { id: 'a2', semanticContent: 'A2', isCorrect: false },
        ],
      },
      {
        id: 'b',
        type: 'Selecting',
        minSelections: 1,
        maxSelections: 1,
        standaloneChoiceOrderPolicy: 'Permutable',
        choices: [
          { id: 'b1', semanticContent: 'B1', isCorrect: true },
          { id: 'b2', semanticContent: 'B2', isCorrect: false },
        ],
      },
    ],
    [
      {
        id: 'shared',
        sourceContent: 'Shared context remains visible for interaction A.',
        allowedModalities: ['Text'],
        materializationPolicy: 'Fixed',
      },
    ],
    [
      { interactionRef: 'a', stimulusRef: 'shared', role: 'Context' },
      { interactionRef: 'b', stimulusRef: 'shared', role: 'Context' },
    ],
    [dependency]
  )
  const qfdDependency = {
    predecessorInteractionRef: 'a',
    successorInteractionRef: 'b',
    rule: 'RequiresCompletion' as const,
    exposurePolicy: 'ConcealedUntilSatisfied' as const,
  }
  const key = dependencyEvidenceKey(qfdDependency)
  return {
    id: negative ? 'B12-N' : 'B12-P',
    qd: question,
    qfd: buildQfd(
      question,
      INTERACTIVE_WEB_PROFILE,
      [
        selecting('a', ['a1', 'a2'], 'Expanded'),
        selecting('b', ['b1', 'b2'], 'Expanded'),
      ],
      [stimulusRealization('b12-shared-sr', 'shared', ['a', 'b'], 'Text')],
      [],
      [qfdDependency]
    ),
    profile: INTERACTIVE_WEB_PROFILE,
    expected: {
      ...PASS,
      conformance: negative ? 'NON_CONFORMANT' : 'CONFORMANT',
    },
    options: {
      conformanceEvidence: {
        ...directReuse('b12-shared-sr'),
        ...(negative
          ? { prematurelyExposedDependencyKeys: new Set([key]) }
          : { verifiedConcealedDependencyKeys: new Set([key]) }),
      },
    },
  }
}

export const FROZEN_PRIMARY_CASES: FrozenEvaluationCase[] = [
  makeQ1(INTERACTIVE_WEB_PROFILE),
  makeQ1(CONVENTIONAL_PAPER_PROFILE),
  makeQ2(INTERACTIVE_WEB_PROFILE),
  makeQ2(CONVENTIONAL_PAPER_PROFILE),
  makeQ3(INTERACTIVE_WEB_PROFILE),
  makeQ3(CONVENTIONAL_PAPER_PROFILE),
  makeQ4(INTERACTIVE_WEB_PROFILE),
  makeQ4(CONVENTIONAL_PAPER_PROFILE),
  makeQ5(INTERACTIVE_WEB_PROFILE),
  makeQ5(CONVENTIONAL_PAPER_PROFILE),
  makeQ6(INTERACTIVE_WEB_PROFILE),
  makeQ6(CONVENTIONAL_PAPER_PROFILE),
  makeQ7(INTERACTIVE_WEB_PROFILE),
  makeQ7(CONVENTIONAL_PAPER_PROFILE),
  makeQ8(INTERACTIVE_WEB_PROFILE, 'A'),
  makeQ8(CONVENTIONAL_PAPER_PROFILE, 'A'),
  makeQ8(INTERACTIVE_WEB_PROFILE, 'B'),
  makeQ8(CONVENTIONAL_PAPER_PROFILE, 'B'),
  makeQ9(INTERACTIVE_WEB_PROFILE),
  makeQ9(CONVENTIONAL_PAPER_PROFILE),
  makeQ10(INTERACTIVE_WEB_PROFILE),
  makeQ10(CONVENTIONAL_PAPER_PROFILE),
  makeQ11(INTERACTIVE_WEB_PROFILE),
  makeQ11(CONVENTIONAL_PAPER_PROFILE),
  makeQ12(INTERACTIVE_WEB_PROFILE),
  makeQ12(CONVENTIONAL_PAPER_PROFILE),
]

const q1Web = makeQ1(INTERACTIVE_WEB_PROFILE)
const q2Paper = makeQ2(CONVENTIONAL_PAPER_PROFILE)
const q3Web = makeQ3(INTERACTIVE_WEB_PROFILE)
const q5Web = makeQ5(INTERACTIVE_WEB_PROFILE)
const q6Web = makeQ6(INTERACTIVE_WEB_PROFILE)
const q12Web = makeQ12(INTERACTIVE_WEB_PROFILE)

const b01Qd = clone(q1Web.qd)
const b01Selecting = b01Qd.responseInteractions[0]
if (b01Selecting?.type === 'Selecting') b01Selecting.choices[1].isCorrect = true

const b02Qd = clone(q12Web.qd)
b02Qd.responseInteractions[0] = {
  id: 'i1',
  type: 'Essay',
  minLength: 1,
  lengthUnit: 'Words',
}

const b03Qfd = clone(q1Web.qfd)
b03Qfd.interactionRealizations.push(clone(q1Web.qfd.interactionRealizations[0]))

const b04Qd = clone(q6Web.qd)
b04Qd.associations = b04Qd.associations.filter(
  ({ interactionRef }) => interactionRef === 'short'
)
const b04Qfd = buildQfd(
  b04Qd,
  INTERACTIVE_WEB_PROFILE,
  [scalar('short'), essay('essay')],
  [stimulusRealization('b04-sr', 'q6-video', ['short', 'essay'], 'Video')],
  [{ beforeInteractionRef: 'short', afterInteractionRef: 'essay' }]
)

const b05Qfd = buildQfd(q2Paper.qd, CONVENTIONAL_PAPER_PROFILE, [
  ordering('order', ['first', 'second', 'third'], 'DirectOrdering'),
])

const b06Qfd = clone(q5Web.qfd)
b06Qfd.stimulusRealizations[0].realizedModality = 'Image'

const b09Qfd = clone(q3Web.qfd)
const b09Relating = b09Qfd.interactionRealizations[0]
if (b09Relating?.type === 'RelatingRealization') {
  const children = b09Relating.sourceSetPresentation.localLayout
  if (children.kind === 'LayoutGroup') children.children.reverse()
}

const b10Qd = clone(q1Web.qd)
b10Qd.responseInteractions[0].instruction = 'Select the single correct option.'
const b10Realization = selecting('select', ['a', 'b'], 'Collapsed')
b10Realization.instructionRealizations = [
  {
    id: 'b10-task',
    role: 'TaskInstruction',
    realizedText: 'Choose the option that seems most suitable.',
  },
]
const b10Qfd = buildQfd(b10Qd, INTERACTIVE_WEB_PROFILE, [b10Realization])

const b11Qfd = clone(q3Web.qfd)
b11Qfd.stimulusRealizations.push({
  ...clone(b11Qfd.stimulusRealizations[0]),
  id: 'q3-sr-second',
})
b11Qfd.rootLayout = {
  kind: 'LayoutGroup',
  orientation: 'Vertical',
  children: collectOuterPlacements(b11Qfd),
}

export const FROZEN_BOUNDARY_CASES: FrozenEvaluationCase[] = [
  {
    id: 'B01',
    qd: b01Qd,
    qfd: q1Web.qfd,
    profile: INTERACTIVE_WEB_PROFILE,
    expected: {
      qdValidation: 'FAIL',
      qfdValidation: 'NOT_EVALUATED',
      feasibility: 'NOT_EVALUATED',
      conformance: 'NOT_EVALUATED',
    },
  },
  {
    id: 'B02',
    qd: b02Qd,
    qfd: q12Web.qfd,
    profile: INTERACTIVE_WEB_PROFILE,
    expected: {
      qdValidation: 'FAIL',
      qfdValidation: 'NOT_EVALUATED',
      feasibility: 'NOT_EVALUATED',
      conformance: 'NOT_EVALUATED',
    },
  },
  {
    id: 'B03',
    qd: q1Web.qd,
    qfd: b03Qfd,
    profile: INTERACTIVE_WEB_PROFILE,
    expected: {
      qdValidation: 'PASS',
      qfdValidation: 'FAIL',
      feasibility: 'NOT_EVALUATED',
      conformance: 'NOT_EVALUATED',
    },
  },
  {
    id: 'B04',
    qd: b04Qd,
    qfd: b04Qfd,
    profile: INTERACTIVE_WEB_PROFILE,
    expected: {
      qdValidation: 'PASS',
      qfdValidation: 'FAIL',
      feasibility: 'NOT_EVALUATED',
      conformance: 'NOT_EVALUATED',
    },
  },
  {
    id: 'B05',
    qd: q2Paper.qd,
    qfd: b05Qfd,
    profile: CONVENTIONAL_PAPER_PROFILE,
    expected: { ...PASS, feasibility: 'INFEASIBLE' },
  },
  {
    id: 'B06',
    qd: q5Web.qd,
    qfd: b06Qfd,
    profile: INTERACTIVE_WEB_PROFILE,
    expected: { ...PASS, conformance: 'NON_CONFORMANT' },
    options: { conformanceEvidence: directReuse('q5-sr') },
  },
  {
    ...makeQ12(CONVENTIONAL_PAPER_PROFILE, 'Preferred', false),
    id: 'B07',
  },
  {
    ...makeQ12(CONVENTIONAL_PAPER_PROFILE, 'Preferred', true),
    id: 'B08',
  },
  {
    id: 'B09',
    qd: q3Web.qd,
    qfd: b09Qfd,
    profile: INTERACTIVE_WEB_PROFILE,
    expected: { ...PASS, conformance: 'NON_CONFORMANT' },
    options: q3Web.options,
  },
  {
    id: 'B10',
    qd: b10Qd,
    qfd: b10Qfd,
    profile: INTERACTIVE_WEB_PROFILE,
    expected: { ...PASS, conformance: 'REVIEW_REQUIRED' },
  },
  {
    id: 'B11',
    qd: q3Web.qd,
    qfd: b11Qfd,
    profile: INTERACTIVE_WEB_PROFILE,
    expected: PASS,
    options: {
      conformanceEvidence: directReuse('q3-sr', 'q3-sr-second'),
    },
  },
  makeB12(false),
  makeB12(true),
]

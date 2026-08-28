import { referenceContentCarrier } from '../../qd/implementation/contentCarrier'
import type { QuestionDefinition } from '../../qd/model'
import type {
  ElementPresentation,
  LayoutElement,
  LayoutableRealizationRef,
  QuestionFormDefinition,
  ResponseElementRef,
} from '../model'
import type { QuestionFormProfile } from '../profiles/model'

export const qfdTestProfile: QuestionFormProfile = {
  id: 'profile-pr2',
  supportedStimulusModalities: ['Text', 'Image'],
  capabilities: [
    'TextualPresentation',
    'ExpandedSelection',
    'DirectWorkspaceSelection',
    'ReferencedWorkspaceSelection',
    'DirectOrdering',
    'DirectRelationConstruction',
    'DirectItemPlacement',
    'EmbeddedGapResponse',
    'ReferencedGapResponse',
    'ScalarResponse',
    'ExtendedTextResponse',
    'DigitalArtifactSubmission',
    'RegionMarking',
    'HorizontalComposition',
    'VerticalComposition',
    'TextAnchoredPlacement',
    'RegionAnchoredPlacement',
    'LogicalInteractionPrecedence',
    'CorrectnessGating',
    'ConditionalConcealment',
  ],
}

export const qfdTestQd: QuestionDefinition = {
  id: 'qd-pr2',
  responseInteractions: [
    {
      id: 'selecting',
      type: 'Selecting',
      minSelections: 1,
      maxSelections: 2,
      standaloneChoiceOrderPolicy: 'Permutable',
      choices: [
        { id: 'standalone-a', semanticContent: 'A', isCorrect: true },
        { id: 'standalone-b', semanticContent: 'B', isCorrect: false },
        {
          id: 'workspace-choice',
          semanticContent: 'Workspace choice',
          isCorrect: true,
          workspaceStimulusRef: 'stim-select',
          sourceAnchor: {
            kind: 'TextAnchor',
            payload: { implementationLocator: '[choice]' },
          },
        },
      ],
    },
    {
      id: 'ordering',
      type: 'Ordering',
      itemOrderPolicy: 'Permutable',
      orderingItems: [
        { id: 'order-a', semanticContent: 'First' },
        { id: 'order-b', semanticContent: 'Second' },
      ],
      correctOrder: ['order-a', 'order-b'],
    },
    {
      id: 'relating',
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
    },
    {
      id: 'completing',
      type: 'Completing',
      completingItems: [
        { id: 'item-a', semanticContent: 'One' },
        { id: 'item-b', semanticContent: 'Two' },
      ],
      completingGaps: [
        {
          id: 'input-gap',
          type: 'InputGap',
          workspaceStimulusRef: 'stim-complete',
          sourceAnchor: {
            kind: 'TextAnchor',
            payload: { implementationLocator: '[input]' },
          },
          inputType: 'Text',
          correctValues: ['answer'],
        },
        {
          id: 'item-gap',
          type: 'ItemGap',
          workspaceStimulusRef: 'stim-complete',
          sourceAnchor: {
            kind: 'TextAnchor',
            payload: { implementationLocator: '[item]' },
          },
          correctItemRefs: ['item-a'],
        },
      ],
    },
    {
      id: 'short',
      type: 'ShortInput',
      inputType: 'Integer',
      correctValues: [2],
    },
    { id: 'essay', type: 'Essay', minLength: 5, lengthUnit: 'Words' },
    {
      id: 'artifact',
      type: 'ArtifactSubmission',
      minArtifacts: 1,
      maxArtifacts: 1,
      artifactSpecification: 'Submit one file.',
    },
    {
      id: 'marking',
      type: 'Marking',
      markType: 'Region',
      minMarks: 1,
      maxMarks: 1,
    },
  ],
  stimuli: [
    {
      id: 'stim-select',
      sourceContent: referenceContentCarrier('Choose [choice].', {
        text: true,
      }),
      allowedModalities: ['Text'],
      materializationPolicy: 'Fixed',
    },
    {
      id: 'stim-complete',
      sourceContent: referenceContentCarrier('[input] and [item]', {
        text: true,
      }),
      allowedModalities: ['Text'],
      materializationPolicy: 'Fixed',
    },
    {
      id: 'stim-mark',
      sourceContent: referenceContentCarrier('/diagram.png', { region: true }),
      allowedModalities: ['Image'],
      materializationPolicy: 'Fixed',
    },
  ],
  associations: [
    {
      interactionRef: 'selecting',
      stimulusRef: 'stim-select',
      role: 'Workspace',
    },
    {
      interactionRef: 'completing',
      stimulusRef: 'stim-complete',
      role: 'Workspace',
    },
    { interactionRef: 'marking', stimulusRef: 'stim-mark', role: 'Workspace' },
  ],
  constraints: [],
}

export interface QfdFixtureOptions {
  workspaceSelection?: 'DirectSelection' | 'ReferencedSelection'
  itemAssignment?: 'ItemSelection' | 'DirectPlacement'
  itemResponsePlacement?: 'Embedded' | 'Referenced'
}

export function buildValidQfd(
  options: QfdFixtureOptions = {}
): QuestionFormDefinition {
  const workspaceSelection = options.workspaceSelection ?? 'DirectSelection'
  const itemAssignment = options.itemAssignment ?? 'ItemSelection'
  const itemResponsePlacement = options.itemResponsePlacement ?? 'Referenced'
  const selecting = {
    type: 'SelectingRealization' as const,
    interactionRef: 'selecting',
    instructionRealizations: [
      { id: 'select-task', role: 'TaskInstruction' as const },
      {
        id: 'select-guidance',
        role: 'OperationalGuidance' as const,
        realizedText: 'Choose the applicable response.',
      },
    ],
    standaloneSelection: {
      id: 'standalone-selection',
      mode: 'Expanded' as const,
      optionPresentations: [
        presentation('standalone-a-p', {
          kind: 'Choice',
          interactionRef: 'selecting',
          choiceRef: 'standalone-a',
        }),
        presentation('standalone-b-p', {
          kind: 'Choice',
          interactionRef: 'selecting',
          choiceRef: 'standalone-b',
        }),
      ],
      localLayout: localLayout(['standalone-a-p', 'standalone-b-p']),
    },
    workspaceRealizations: [
      {
        stimulusRealizationRef: 'sr-select',
        mode: workspaceSelection,
        choiceRealizations: [
          {
            choiceRef: 'workspace-choice',
            realizationAnchor: {
              kind: 'TextRealizationAnchor' as const,
              payload: { marker: '[choice]' },
            },
          },
        ],
        ...(workspaceSelection === 'ReferencedSelection'
          ? { referencedResponseSite: { id: 'workspace-choice-site' } }
          : {}),
      },
    ],
  }

  const itemSelection = {
    id: 'item-selection',
    mode: 'Collapsed' as const,
    optionPresentations: completingItemPresentations('selection'),
    localLayout: localLayout(['selection-item-a-p', 'selection-item-b-p']),
  }
  const itemSource = {
    id: 'item-source',
    itemPresentations: completingItemPresentations('source'),
    localLayout: localLayout(['source-item-a-p', 'source-item-b-p']),
  }
  const completing = {
    type: 'CompletingRealization' as const,
    interactionRef: 'completing',
    instructionRealizations: [],
    gapRealizations: [
      {
        type: 'InputGapRealization' as const,
        gapRef: 'input-gap',
        stimulusRealizationRef: 'sr-complete',
        responsePlacement: 'Embedded' as const,
        responseSite: { id: 'input-gap-site' },
      },
      {
        type: 'ItemGapRealization' as const,
        gapRef: 'item-gap',
        stimulusRealizationRef: 'sr-complete',
        responsePlacement: itemResponsePlacement,
        assignmentMode: itemAssignment,
        ...(itemAssignment === 'ItemSelection'
          ? { selectionPresentation: itemSelection }
          : itemResponsePlacement === 'Referenced'
            ? { referencedPlacementSite: { id: 'item-placement-site' } }
            : {}),
      },
    ],
    ...(itemAssignment === 'DirectPlacement' ? { itemSource } : {}),
  }

  const qfd: QuestionFormDefinition = {
    questionDefinitionRef: qfdTestQd.id,
    targetProfileRef: qfdTestProfile.id,
    stimulusRealizations: [
      stimulusRealization('sr-select', 'stim-select', ['selecting'], 'Text'),
      stimulusRealization(
        'sr-complete',
        'stim-complete',
        ['completing'],
        'Text'
      ),
      stimulusRealization('sr-mark', 'stim-mark', ['marking'], 'Image'),
    ],
    interactionRealizations: [
      selecting,
      {
        type: 'OrderingRealization',
        interactionRef: 'ordering',
        instructionRealizations: [],
        mode: 'DirectOrdering',
        presentation: {
          id: 'ordering-presentation',
          itemPresentations: [
            presentation('order-a-p', {
              kind: 'OrderingItem',
              interactionRef: 'ordering',
              orderingItemRef: 'order-a',
            }),
            presentation('order-b-p', {
              kind: 'OrderingItem',
              interactionRef: 'ordering',
              orderingItemRef: 'order-b',
            }),
          ],
          localLayout: localLayout(['order-a-p', 'order-b-p']),
        },
      },
      {
        type: 'RelatingRealization',
        interactionRef: 'relating',
        instructionRealizations: [],
        mode: 'DirectRelationConstruction',
        sourceSetPresentation: {
          id: 'relating-source',
          elementPresentations: [
            presentation('source-shared-p', {
              kind: 'RelatingElement',
              interactionRef: 'relating',
              set: 'Source',
              relatingElementRef: 'shared',
            }),
          ],
          localLayout: localLayout(['source-shared-p']),
        },
        targetSetPresentation: {
          id: 'relating-target',
          elementPresentations: [
            presentation('target-shared-p', {
              kind: 'RelatingElement',
              interactionRef: 'relating',
              set: 'Target',
              relatingElementRef: 'shared',
            }),
          ],
          localLayout: localLayout(['target-shared-p']),
        },
      },
      completing,
      {
        type: 'ShortInputRealization',
        interactionRef: 'short',
        instructionRealizations: [],
        responseSite: { id: 'short-site' },
      },
      {
        type: 'EssayRealization',
        interactionRef: 'essay',
        instructionRealizations: [],
        responseSite: { id: 'essay-site' },
      },
      {
        type: 'ArtifactSubmissionRealization',
        interactionRef: 'artifact',
        instructionRealizations: [],
        submissionMode: 'DigitalSubmission',
        submissionSite: { id: 'artifact-site' },
      },
      {
        type: 'MarkingRealization',
        interactionRef: 'marking',
        instructionRealizations: [],
        workspaceRealizationRef: 'sr-mark',
      },
    ],
    interactionPrecedences: [
      { beforeInteractionRef: 'selecting', afterInteractionRef: 'ordering' },
    ],
    dependencyRealizations: [
      {
        predecessorInteractionRef: 'selecting',
        successorInteractionRef: 'essay',
        rule: 'RequiresCorrectness',
        exposurePolicy: 'ConcealedUntilSatisfied',
      },
    ],
    rootLayout: { kind: 'LayoutGroup', orientation: 'Vertical', children: [] },
  }
  qfd.rootLayout = outerLayout(qfd, {
    workspaceSelection,
    itemAssignment,
    itemResponsePlacement,
  })
  return qfd
}

export const validQfd = buildValidQfd()

export function cloneQfd(
  qfd: QuestionFormDefinition = validQfd
): QuestionFormDefinition {
  return structuredClone(qfd)
}

function presentation(
  id: string,
  elementRef: ResponseElementRef
): ElementPresentation {
  return { id, elementRef }
}

function completingItemPresentations(prefix: string): ElementPresentation[] {
  return ['item-a', 'item-b'].map((item) =>
    presentation(`${prefix}-${item}-p`, {
      kind: 'CompletingItem',
      interactionRef: 'completing',
      completingItemRef: item,
    })
  )
}

function placement(
  kind: LayoutableRealizationRef['kind'],
  id: string
): LayoutElement {
  return { kind: 'LayoutPlacement', realizationRef: { kind, id } }
}

function localLayout(ids: string[]): LayoutElement {
  return {
    kind: 'LayoutGroup',
    orientation: 'Horizontal',
    children: ids.map((id) => placement('ElementPresentation', id)),
  }
}

function stimulusRealization(
  id: string,
  stimulusRef: string,
  servedInteractionRefs: string[],
  realizedModality: 'Text' | 'Image'
) {
  return {
    id,
    stimulusRef,
    servedInteractionRefs,
    realizedModality,
    mode: 'PreserveContent' as const,
  }
}

function outerLayout(
  qfd: QuestionFormDefinition,
  options: Required<QfdFixtureOptions>
): LayoutElement {
  const children: LayoutElement[] = [
    ...qfd.stimulusRealizations.map(({ id }) =>
      placement('StimulusRealization', id)
    ),
    placement('InstructionRealization', 'select-task'),
    placement('InstructionRealization', 'select-guidance'),
    placement('SelectionPresentation', 'standalone-selection'),
    placement('OrderingPresentation', 'ordering-presentation'),
    placement('RelatingSetPresentation', 'relating-source'),
    placement('RelatingSetPresentation', 'relating-target'),
    placement('ResponseSiteRealization', 'short-site'),
    placement('ResponseSiteRealization', 'essay-site'),
    placement('ResponseSiteRealization', 'artifact-site'),
  ]
  if (options.workspaceSelection === 'ReferencedSelection')
    children.push(placement('ResponseSiteRealization', 'workspace-choice-site'))
  if (options.itemAssignment === 'ItemSelection') {
    if (options.itemResponsePlacement === 'Referenced')
      children.push(placement('SelectionPresentation', 'item-selection'))
  } else {
    children.push(placement('CompletingItemSourceRealization', 'item-source'))
    if (options.itemResponsePlacement === 'Referenced')
      children.push(placement('ResponseSiteRealization', 'item-placement-site'))
  }
  return {
    kind: 'LayoutGroup',
    orientation: 'Vertical',
    children: [
      {
        kind: 'LayoutGroup',
        orientation: 'Horizontal',
        children: children.slice(0, 4),
      },
      ...children.slice(4),
    ],
  }
}

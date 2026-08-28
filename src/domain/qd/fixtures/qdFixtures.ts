import type { QuestionDefinition } from '../model'

export const validAllInteractions: QuestionDefinition = {
  id: 'qd-all-interactions',
  responseInteractions: [
    {
      id: 'selecting',
      type: 'Selecting',
      minSelections: 1,
      maxSelections: 1,
      standaloneChoiceOrderPolicy: 'Permutable',
      choices: [
        { id: 'choice-a', semanticContent: 'Paris', isCorrect: true },
        { id: 'choice-b', semanticContent: 'Berlin', isCorrect: false },
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
        label: 'Countries',
        elementOrderPolicy: 'Permutable',
        relatingElements: [{ id: 'source-fr', semanticContent: 'France' }],
      },
      targetSet: {
        label: 'Capitals',
        elementOrderPolicy: 'Permutable',
        relatingElements: [{ id: 'target-paris', semanticContent: 'Paris' }],
      },
      correctRelations: [
        { sourceElementRef: 'source-fr', targetElementRef: 'target-paris' },
      ],
    },
    {
      id: 'completing',
      type: 'Completing',
      completingItems: [
        { id: 'item-paris', semanticContent: 'Paris', usageLimit: 1 },
      ],
      completingGaps: [
        {
          id: 'gap-city',
          type: 'ItemGap',
          workspaceStimulusRef: 'stimulus-text',
          sourceAnchor: { kind: 'TextAnchor', marker: '[city]' },
          correctItemRefs: ['item-paris'],
        },
      ],
    },
    {
      id: 'short-input',
      type: 'ShortInput',
      inputType: 'Integer',
      correctValues: [42],
      minValue: 0,
      maxValue: 100,
    },
    {
      id: 'essay',
      type: 'Essay',
      minLength: 10,
      maxLength: 100,
      lengthUnit: 'Words',
    },
    {
      id: 'artifact',
      type: 'ArtifactSubmission',
      minArtifacts: 1,
      maxArtifacts: 2,
      artifactSpecification: 'Submit the completed design artifact.',
    },
    {
      id: 'marking',
      type: 'Marking',
      markType: 'Region',
      minMarks: 1,
      maxMarks: 2,
    },
  ],
  stimuli: [
    {
      id: 'stimulus-text',
      sourceContent: 'The capital is [city].',
      allowedModalities: ['Text'],
      materializationPolicy: 'Fixed',
    },
    {
      id: 'stimulus-image',
      sourceContent: '/assets/map.png',
      allowedModalities: ['Image'],
      materializationPolicy: 'Fixed',
    },
  ],
  associations: [
    {
      interactionRef: 'completing',
      stimulusRef: 'stimulus-text',
      role: 'Workspace',
    },
    {
      interactionRef: 'marking',
      stimulusRef: 'stimulus-image',
      role: 'Workspace',
    },
  ],
  constraints: [
    { type: 'Sequence', interactionRefs: ['selecting', 'ordering'] },
    {
      type: 'Dependency',
      predecessorInteractionRef: 'selecting',
      successorInteractionRef: 'essay',
      rule: 'RequiresCorrectness',
      exposurePolicy: 'ConcealedUntilSatisfied',
      strength: 'Required',
    },
  ],
}

export function cloneQuestionDefinition(
  qd: QuestionDefinition = validAllInteractions
): QuestionDefinition {
  return structuredClone(qd)
}

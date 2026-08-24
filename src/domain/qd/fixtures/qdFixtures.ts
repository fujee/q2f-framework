import type {
  ArtifactSubmission,
  Completing,
  Essay,
  InteractionStimulusAssociation,
  Marking,
  Ordering,
  QuestionConstraint,
  QuestionDefinition,
  Relating,
  Selecting,
  ShortInput,
  Stimulus,
} from '../model'

/** Fixtures covering the QD plan's required fixture set (Section 17) restricted to
 * the QD layer (no QFD/feasibility/conformance concepts, since those layers are not
 * implemented yet). Each fixture is a minimal, self-contained QuestionDefinition. */

function qd(
  partial: Partial<QuestionDefinition> &
    Pick<QuestionDefinition, 'id' | 'responseInteractions'>
): QuestionDefinition {
  return {
    status: 'Draft',
    categories: [],
    stimuli: [],
    interactionStimulusAssociations: [],
    constraints: [],
    ...partial,
  }
}

// ---------------------------------------------------------------------------
// 1-2. Selecting
// ---------------------------------------------------------------------------

const singleSelect: Selecting = {
  id: 'int-select-1',
  code: 'Q1',
  type: 'Selecting',
  itemOrderPolicy: 'Fixed',
  minSelections: 1,
  maxSelections: 1,
  choices: [
    { id: 'c1', code: 'A', name: 'Paris', isCorrect: true },
    { id: 'c2', code: 'B', name: 'Berlin', isCorrect: false },
    { id: 'c3', code: 'C', name: 'Rome', isCorrect: false },
  ],
}

export const validSingleSelect: QuestionDefinition = qd({
  id: 'qd-select-valid',
  responseInteractions: [singleSelect],
})

export const invalidSelectingTooManyCorrect: QuestionDefinition = qd({
  id: 'qd-select-invalid-sel005',
  responseInteractions: [
    {
      ...singleSelect,
      choices: [
        { id: 'c1', code: 'A', name: 'Paris', isCorrect: true },
        { id: 'c2', code: 'B', name: 'Berlin', isCorrect: true },
        { id: 'c3', code: 'C', name: 'Rome', isCorrect: false },
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// 3-4. Ordering
// ---------------------------------------------------------------------------

const ordering: Ordering = {
  id: 'int-order-1',
  code: 'Q2',
  type: 'Ordering',
  itemOrderPolicy: 'Permutable',
  orderingItems: [
    { id: 'o1', code: 'step1', name: 'Mix flour' },
    { id: 'o2', code: 'step2', name: 'Add water' },
    { id: 'o3', code: 'step3', name: 'Bake' },
  ],
  correctOrder: ['o1', 'o2', 'o3'],
}

export const validOrderingComplete: QuestionDefinition = qd({
  id: 'qd-ordering-valid',
  responseInteractions: [ordering],
})

export const invalidOrderingDuplicate: QuestionDefinition = qd({
  id: 'qd-ordering-invalid-ord004',
  responseInteractions: [{ ...ordering, correctOrder: ['o1', 'o1', 'o3'] }],
})

// ---------------------------------------------------------------------------
// 5-7. Relating
// ---------------------------------------------------------------------------

function makeRelating(
  mappingType: Relating['mappingType'],
  correctRelations: Relating['correctRelations']
): Relating {
  return {
    id: `int-relate-${mappingType}`,
    code: `REL-${mappingType}`,
    type: 'Relating',
    mappingType,
    sourceParticipationPolicy: 'Optional',
    sourceSet: {
      code: 'countries',
      name: 'Countries',
      elementOrderPolicy: 'Fixed',
      relatingElements: [
        { id: 's1', code: 'FR', name: 'France' },
        { id: 's2', code: 'DE', name: 'Germany' },
      ],
    },
    targetSet: {
      code: 'capitals',
      name: 'Capitals',
      elementOrderPolicy: 'Fixed',
      relatingElements: [
        { id: 't1', code: 'PAR', name: 'Paris' },
        { id: 't2', code: 'BER', name: 'Berlin' },
      ],
    },
    correctRelations,
  }
}

export const relatingOneToOneValid: QuestionDefinition = qd({
  id: 'qd-relating-onetoone',
  responseInteractions: [
    makeRelating('OneToOne', [
      { sourceElementRef: 's1', targetElementRef: 't1' },
      { sourceElementRef: 's2', targetElementRef: 't2' },
    ]),
  ],
})

export const relatingOneToManyValid: QuestionDefinition = qd({
  id: 'qd-relating-onetomany',
  responseInteractions: [
    makeRelating('OneToMany', [
      { sourceElementRef: 's1', targetElementRef: 't1' },
      { sourceElementRef: 's1', targetElementRef: 't2' },
    ]),
  ],
})

export const relatingManyToOneValid: QuestionDefinition = qd({
  id: 'qd-relating-manytoone',
  responseInteractions: [
    makeRelating('ManyToOne', [
      { sourceElementRef: 's1', targetElementRef: 't1' },
      { sourceElementRef: 's2', targetElementRef: 't1' },
    ]),
  ],
})

export const relatingManyToManyValid: QuestionDefinition = qd({
  id: 'qd-relating-manytomany',
  responseInteractions: [
    makeRelating('ManyToMany', [
      { sourceElementRef: 's1', targetElementRef: 't1' },
      { sourceElementRef: 's1', targetElementRef: 't2' },
      { sourceElementRef: 's2', targetElementRef: 't1' },
    ]),
  ],
})

export const relatingRequiredParticipationFail: QuestionDefinition = qd({
  id: 'qd-relating-invalid-rel008',
  responseInteractions: [
    {
      ...makeRelating('ManyToMany', [
        { sourceElementRef: 's1', targetElementRef: 't1' },
      ]),
      sourceParticipationPolicy: 'Required',
    },
  ],
})

export const relatingCardinalityFail: QuestionDefinition = qd({
  id: 'qd-relating-invalid-rel007',
  responseInteractions: [
    makeRelating('OneToOne', [
      { sourceElementRef: 's1', targetElementRef: 't1' },
      { sourceElementRef: 's1', targetElementRef: 't2' },
    ]),
  ],
})

// ---------------------------------------------------------------------------
// 8-14. Completing
// ---------------------------------------------------------------------------

export const completingLocalTextAnchor: QuestionDefinition = qd({
  id: 'qd-completing-local',
  responseInteractions: [
    {
      id: 'int-cmp-local',
      code: 'Q3',
      type: 'Completing',
      localContent: 'The capital of France is {{gap1}}.',
      completingItems: [],
      completingGaps: [
        {
          id: 'gap-1',
          code: 'gap1',
          anchor: { kind: 'TextAnchor', marker: '{{gap1}}' },
          type: 'TextInputGap',
          correctValues: ['Paris'],
          caseSensitive: false,
          trimWhitespace: true,
        },
      ],
    } satisfies Completing,
  ],
})

const textWorkspaceStimulus: Stimulus = {
  id: 'stim-text-1',
  code: 'STM-TEXT',
  type: 'Text',
  description: 'A short passage',
  materializationPolicy: 'Fixed',
  content: 'The capital of France is [Paris].',
}

export const completingTextStimulusWorkspace: QuestionDefinition = qd({
  id: 'qd-completing-text-workspace',
  stimuli: [textWorkspaceStimulus],
  responseInteractions: [
    {
      id: 'int-cmp-text-ws',
      code: 'Q3b',
      type: 'Completing',
      completingItems: [],
      completingGaps: [
        {
          id: 'gap-2',
          code: 'gap1',
          stimulusRef: 'stim-text-1',
          anchor: { kind: 'TextAnchor', marker: '[Paris]' },
          type: 'TextInputGap',
          correctValues: ['Paris'],
          caseSensitive: false,
          trimWhitespace: true,
        },
      ],
    } satisfies Completing,
  ],
  interactionStimulusAssociations: [
    {
      id: 'assoc-1',
      interactionRef: 'int-cmp-text-ws',
      stimulusRef: 'stim-text-1',
      role: 'Workspace',
    },
  ],
})

const imageWorkspaceStimulus: Stimulus = {
  id: 'stim-image-1',
  code: 'STM-IMAGE',
  type: 'Image',
  description: 'A labeled diagram',
  materializationPolicy: 'Fixed',
  source: '/assets/diagram.png',
}

export const completingImageStimulusWorkspace: QuestionDefinition = qd({
  id: 'qd-completing-image-workspace',
  stimuli: [imageWorkspaceStimulus],
  responseInteractions: [
    {
      id: 'int-cmp-image-ws',
      code: 'Q4',
      type: 'Completing',
      completingItems: [
        {
          id: 'item-1',
          code: 'nucleus',
          type: 'TextCompletingItem',
          text: 'Nucleus',
          usageLimit: 1,
        },
        {
          id: 'item-2',
          code: 'membrane',
          type: 'TextCompletingItem',
          text: 'Membrane',
          usageLimit: 1,
        },
      ],
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
          type: 'DropTargetGap',
          correctItemRefs: ['item-1'],
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
    } satisfies Completing,
  ],
  interactionStimulusAssociations: [
    {
      id: 'assoc-2',
      interactionRef: 'int-cmp-image-ws',
      stimulusRef: 'stim-image-1',
      role: 'Workspace',
    },
  ],
})

const specBasedStimulus: Stimulus = {
  id: 'stim-spec-1',
  code: 'STM-SPEC',
  type: 'Image',
  description: 'A procedurally generated map',
  materializationPolicy: 'SpecificationBased',
  contentSpecification:
    'Render a map of the current chapter region at zoom level 4.',
}

export const completingSpecBasedNoAnchor: QuestionDefinition = qd({
  id: 'qd-completing-specbased',
  stimuli: [specBasedStimulus],
  responseInteractions: [
    {
      id: 'int-cmp-spec',
      code: 'Q4b',
      type: 'Completing',
      completingItems: [
        {
          id: 'item-3',
          code: 'capital',
          type: 'TextCompletingItem',
          text: 'Capital city',
          usageLimit: 1,
        },
      ],
      completingGaps: [
        {
          id: 'gap-5',
          code: 'capitalMarker',
          stimulusRef: 'stim-spec-1',
          placementSpecification: 'The marker nearest the largest city label.',
          type: 'DropTargetGap',
          correctItemRefs: ['item-3'],
        },
      ],
    } satisfies Completing,
  ],
  interactionStimulusAssociations: [
    {
      id: 'assoc-3',
      interactionRef: 'int-cmp-spec',
      stimulusRef: 'stim-spec-1',
      role: 'Workspace',
    },
  ],
})

export const completingMissingWorkspaceAssociation: QuestionDefinition = qd({
  id: 'qd-completing-invalid-cmp004',
  stimuli: [imageWorkspaceStimulus],
  responseInteractions: [
    {
      id: 'int-cmp-missing-ws',
      code: 'Q4c',
      type: 'Completing',
      completingItems: [
        {
          id: 'item-4',
          code: 'nucleus',
          type: 'TextCompletingItem',
          text: 'Nucleus',
          usageLimit: 1,
        },
      ],
      completingGaps: [
        {
          id: 'gap-6',
          code: 'label1',
          stimulusRef: 'stim-image-1',
          anchor: {
            kind: 'RegionAnchor',
            x: 0.2,
            y: 0.2,
            width: 0.1,
            height: 0.1,
          },
          type: 'DropTargetGap',
          correctItemRefs: ['item-4'],
        },
      ],
    } satisfies Completing,
  ],
  // Intentionally no InteractionStimulusAssociation at all for this pair.
  interactionStimulusAssociations: [],
})

export const completingDropTargetValidAssignment: QuestionDefinition =
  completingImageStimulusWorkspace

export const completingDropTargetInfeasibleAssignment: QuestionDefinition = qd({
  id: 'qd-completing-invalid-cmp015',
  stimuli: [imageWorkspaceStimulus],
  responseInteractions: [
    {
      id: 'int-cmp-infeasible',
      code: 'Q4d',
      type: 'Completing',
      completingItems: [
        {
          id: 'item-5',
          code: 'nucleus',
          type: 'TextCompletingItem',
          text: 'Nucleus',
          usageLimit: 1,
        },
      ],
      completingGaps: [
        {
          id: 'gap-7',
          code: 'label1',
          stimulusRef: 'stim-image-1',
          anchor: {
            kind: 'RegionAnchor',
            x: 0.2,
            y: 0.2,
            width: 0.1,
            height: 0.1,
          },
          type: 'DropTargetGap',
          correctItemRefs: ['item-5'],
        },
        {
          id: 'gap-8',
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
          correctItemRefs: ['item-5'],
        },
      ],
    } satisfies Completing,
  ],
  interactionStimulusAssociations: [
    {
      id: 'assoc-4',
      interactionRef: 'int-cmp-infeasible',
      stimulusRef: 'stim-image-1',
      role: 'Workspace',
    },
  ],
})

// ---------------------------------------------------------------------------
// 15. ShortInput
// ---------------------------------------------------------------------------

const shortInputTextInteraction: ShortInput = {
  id: 'int-sin-text',
  code: 'Q5a',
  type: 'ShortInput',
  inputType: 'Text',
  correctValues: ['Paris'],
  caseSensitive: false,
  trimWhitespace: true,
}
export const shortInputTextValid: QuestionDefinition = qd({
  id: 'qd-shortinput-text',
  responseInteractions: [shortInputTextInteraction],
})

const shortInputNumberInteraction: ShortInput = {
  id: 'int-sin-number',
  code: 'Q5b',
  type: 'ShortInput',
  inputType: 'Number',
  correctValues: [42],
  minValue: 0,
  maxValue: 100,
}
export const shortInputNumberValid: QuestionDefinition = qd({
  id: 'qd-shortinput-number',
  responseInteractions: [shortInputNumberInteraction],
})

const shortInputDateInteraction: ShortInput = {
  id: 'int-sin-date',
  code: 'Q5c',
  type: 'ShortInput',
  inputType: 'Date',
  correctValues: ['2024-07-14'],
  minValue: '2000-01-01',
  maxValue: '2100-01-01',
}
export const shortInputDateValid: QuestionDefinition = qd({
  id: 'qd-shortinput-date',
  responseInteractions: [shortInputDateInteraction],
})

// ---------------------------------------------------------------------------
// 16. Essay
// ---------------------------------------------------------------------------

const essayInteraction: Essay = {
  id: 'int-essay',
  code: 'Q6',
  type: 'Essay',
  minLength: 50,
  maxLength: 500,
  lengthUnit: 'Words',
}
export const essayValid: QuestionDefinition = qd({
  id: 'qd-essay-valid',
  responseInteractions: [essayInteraction],
})

// ---------------------------------------------------------------------------
// 17. ArtifactSubmission
// ---------------------------------------------------------------------------

const artifactSubmissionInteraction: ArtifactSubmission = {
  id: 'int-artifact',
  code: 'Q7',
  type: 'ArtifactSubmission',
  minArtifacts: 1,
  maxArtifacts: 3,
  artifactSpecification: 'A PDF file no larger than 10MB.',
}
export const artifactSubmissionValid: QuestionDefinition = qd({
  id: 'qd-artifact-valid',
  responseInteractions: [artifactSubmissionInteraction],
})

// ---------------------------------------------------------------------------
// 18-19. Marking
// ---------------------------------------------------------------------------

function markingWith(markType: Marking['markType']): Marking {
  return {
    id: `int-mark-${markType}`,
    code: `Q8-${markType}`,
    type: 'Marking',
    markType,
    minMarks: 1,
    maxMarks: 1,
  }
}

export const markingPointOnImageValid: QuestionDefinition = qd({
  id: 'qd-marking-point-valid',
  stimuli: [imageWorkspaceStimulus],
  responseInteractions: [markingWith('Point')],
  interactionStimulusAssociations: [
    {
      id: 'assoc-5',
      interactionRef: 'int-mark-Point',
      stimulusRef: 'stim-image-1',
      role: 'Workspace',
    },
  ],
})

export const markingRegionOnImageValid: QuestionDefinition = qd({
  id: 'qd-marking-region-valid',
  stimuli: [imageWorkspaceStimulus],
  responseInteractions: [markingWith('Region')],
  interactionStimulusAssociations: [
    {
      id: 'assoc-6',
      interactionRef: 'int-mark-Region',
      stimulusRef: 'stim-image-1',
      role: 'Workspace',
    },
  ],
})

export const markingTextSpanOnTextValid: QuestionDefinition = qd({
  id: 'qd-marking-textspan-valid',
  stimuli: [textWorkspaceStimulus],
  responseInteractions: [markingWith('TextSpan')],
  interactionStimulusAssociations: [
    {
      id: 'assoc-7',
      interactionRef: 'int-mark-TextSpan',
      stimulusRef: 'stim-text-1',
      role: 'Workspace',
    },
  ],
})

export const markingInvalidModality: QuestionDefinition = qd({
  id: 'qd-marking-invalid-mrk003',
  stimuli: [textWorkspaceStimulus],
  responseInteractions: [markingWith('Point')],
  interactionStimulusAssociations: [
    {
      id: 'assoc-8',
      interactionRef: 'int-mark-Point',
      stimulusRef: 'stim-text-1',
      role: 'Workspace',
    },
  ],
})

// ---------------------------------------------------------------------------
// 20. Stimulus materialization policies
// ---------------------------------------------------------------------------

export const stimuliMaterializationValid: QuestionDefinition = qd({
  id: 'qd-stimuli-materialization-valid',
  responseInteractions: [shortInputTextInteraction],
  stimuli: [
    {
      id: 'stm-fixed-text',
      code: 'FIXED-TEXT',
      type: 'Text',
      description: 'Fixed text',
      materializationPolicy: 'Fixed',
      content: 'Hello world.',
    },
    {
      id: 'stm-adaptable-image',
      code: 'ADAPT-IMAGE',
      type: 'Image',
      description: 'Adaptable image',
      materializationPolicy: 'Adaptable',
      source: '/assets/base.png',
      contentSpecification: 'Overlay the learner name on the base image.',
    },
    {
      id: 'stm-spec-audio',
      code: 'SPEC-AUDIO',
      type: 'Audio',
      description: 'Specification-based audio',
      materializationPolicy: 'SpecificationBased',
      contentSpecification:
        'Synthesize the sentence using text-to-speech at 1.0x speed.',
    },
  ],
})

// ---------------------------------------------------------------------------
// 21-24. Constraint graph
// ---------------------------------------------------------------------------

const chainInteractions: [ShortInput, ShortInput, ShortInput] = [
  {
    id: 'g-int-1',
    code: 'G1',
    type: 'ShortInput',
    inputType: 'Text',
    correctValues: ['a'],
    caseSensitive: false,
    trimWhitespace: true,
  },
  {
    id: 'g-int-2',
    code: 'G2',
    type: 'ShortInput',
    inputType: 'Text',
    correctValues: ['b'],
    caseSensitive: false,
    trimWhitespace: true,
  },
  {
    id: 'g-int-3',
    code: 'G3',
    type: 'ShortInput',
    inputType: 'Text',
    correctValues: ['c'],
    caseSensitive: false,
    trimWhitespace: true,
  },
]

export const acyclicGraphValid: QuestionDefinition = qd({
  id: 'qd-graph-valid',
  responseInteractions: chainInteractions,
  constraints: [
    {
      id: 'con-seq-1',
      type: 'Sequence',
      strength: 'Required',
      interactionRefs: ['g-int-1', 'g-int-2'],
    },
    {
      id: 'con-dep-1',
      type: 'Dependency',
      strength: 'Required',
      rule: 'RequiresCompletion',
      predecessorInteractionRef: 'g-int-2',
      successorInteractionRef: 'g-int-3',
    },
  ],
})

export const cyclicGraphInvalid: QuestionDefinition = qd({
  id: 'qd-graph-invalid-graph001',
  responseInteractions: chainInteractions,
  constraints: [
    {
      id: 'con-seq-2',
      type: 'Sequence',
      strength: 'Required',
      interactionRefs: ['g-int-1', 'g-int-2'],
    },
    {
      id: 'con-dep-2',
      type: 'Dependency',
      strength: 'Required',
      rule: 'RequiresCompletion',
      predecessorInteractionRef: 'g-int-2',
      successorInteractionRef: 'g-int-3',
    },
    {
      id: 'con-dep-3',
      type: 'Dependency',
      strength: 'Required',
      rule: 'RequiresCompletion',
      predecessorInteractionRef: 'g-int-3',
      successorInteractionRef: 'g-int-1',
    },
  ],
})

export const graph002PreferredConflict: QuestionDefinition = qd({
  id: 'qd-graph-warning-graph002',
  responseInteractions: chainInteractions,
  constraints: [
    {
      id: 'con-seq-3',
      type: 'Sequence',
      strength: 'Required',
      interactionRefs: ['g-int-1', 'g-int-2'],
    },
    {
      id: 'con-dep-4',
      type: 'Dependency',
      strength: 'Preferred',
      rule: 'RequiresCompletion',
      predecessorInteractionRef: 'g-int-2',
      successorInteractionRef: 'g-int-1',
    },
  ],
})

export const dependencyRequiresCorrectnessInvalidPredecessor: QuestionDefinition =
  qd({
    id: 'qd-dep-invalid-dep003',
    responseInteractions: [essayInteraction, shortInputTextInteraction],
    constraints: [
      {
        id: 'con-dep-5',
        type: 'Dependency',
        strength: 'Required',
        rule: 'RequiresCorrectness',
        predecessorInteractionRef: 'int-essay',
        successorInteractionRef: 'int-sin-text',
      } satisfies QuestionConstraint,
    ],
  })

export const allAssociationsFixture: InteractionStimulusAssociation[] = []

// ---------------------------------------------------------------------------
// Protocol mutation catalog additions (evaluation protocol Section 6)
// ---------------------------------------------------------------------------

/** M09: local gaps remain but `localContent` is removed -> CMP-003 FAIL. */
export const completingMissingLocalContent: QuestionDefinition = qd({
  id: 'qd-completing-invalid-cmp003',
  responseInteractions: [
    {
      id: 'int-cmp-no-local',
      code: 'Q4e',
      type: 'Completing',
      completingItems: [],
      completingGaps: [
        {
          id: 'gap-9',
          code: 'gap1',
          anchor: { kind: 'TextAnchor', marker: '{{gap1}}' },
          type: 'TextInputGap',
          correctValues: ['Paris'],
          caseSensitive: false,
          trimWhitespace: true,
        },
      ],
    } satisfies Completing,
  ],
})

/** M11: an AudioStimulus is given the Workspace role -> ASC-003 FAIL. */
export const audioStimulusWorkspaceInvalid: QuestionDefinition = qd({
  id: 'qd-audio-workspace-invalid',
  stimuli: [
    {
      id: 'stim-audio-1',
      code: 'STM-AUDIO',
      type: 'Audio',
      description: 'A recording',
      materializationPolicy: 'Fixed',
      source: '/assets/tones.wav',
    },
  ],
  responseInteractions: [
    {
      id: 'int-select-audio-ws',
      code: 'Q1b',
      type: 'Selecting',
      itemOrderPolicy: 'Permutable',
      minSelections: 1,
      maxSelections: 1,
      choices: [
        { id: 'c-a1', code: 'A', name: 'One tone', isCorrect: true },
        { id: 'c-a2', code: 'B', name: 'Two tones', isCorrect: false },
      ],
    } satisfies Selecting,
  ],
  interactionStimulusAssociations: [
    {
      id: 'assoc-audio-ws',
      interactionRef: 'int-select-audio-ws',
      stimulusRef: 'stim-audio-1',
      role: 'Workspace',
    },
  ],
})

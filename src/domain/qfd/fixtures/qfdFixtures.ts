import type {
  QuestionConstraint,
  QuestionDefinition,
  ResponseInteraction,
  Stimulus,
} from '../../qd/model'
import type {
  Canvas,
  ContainerElement,
  Inline,
  InteractionRealization,
  QuestionFormDefinition,
  Stack,
  StimulusRealization,
} from '../model'

/** Fixtures directly mirroring CODEX_EVALUATION_PROTOCOL_FROZEN_V1_EN.md's primary
 * scenario catalog (Q1-Q12) and a representative subset of the controlled mutation
 * catalog, restricted to what is decidable at the QFD/feasibility/conformance layer
 * (QD-only mutations such as M01/M05/M07/M09/M10/M11/M16/M20/M26/M27 live in
 * `src/domain/qd/fixtures/qdFixtures.ts`). */

function stack(children: Stack['children']): Stack {
  return { kind: 'Stack', direction: 'Vertical', children }
}

function interactionBlock(interactionRealizationRef: string) {
  return { kind: 'InteractionBlock' as const, interactionRealizationRef }
}

function stimulusBlock(stimulusRealizationRef: string) {
  return { kind: 'StimulusBlock' as const, stimulusRealizationRef }
}

function responseElementBlock(
  elementKind: 'Choice' | 'OrderingItem' | 'RelatingElement' | 'CompletingGap',
  elementRef: string
) {
  return { kind: 'ResponseElementBlock' as const, elementKind, elementRef }
}

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

function qfd(
  partial: Partial<QuestionFormDefinition> &
    Pick<
      QuestionFormDefinition,
      | 'id'
      | 'questionDefinitionRef'
      | 'targetProfileRef'
      | 'interactionRealizations'
      | 'rootLayout'
    >
): QuestionFormDefinition {
  return { stimulusRealizations: [], ...partial }
}

// ---------------------------------------------------------------------------
// Q1 — Multiple selection without stimulus
// ---------------------------------------------------------------------------

const q1Interaction: ResponseInteraction = {
  id: 'q1-select',
  code: 'Q1_SELECT',
  instruction: 'Select exactly two noble gases.',
  type: 'Selecting',
  minSelections: 2,
  maxSelections: 2,
  itemOrderPolicy: 'Permutable',
  choices: [
    { id: 'he', code: 'he', name: 'Helium', isCorrect: true },
    { id: 'o', code: 'o', name: 'Oxygen', isCorrect: false },
    { id: 'ne', code: 'ne', name: 'Neon', isCorrect: true },
    { id: 'n', code: 'n', name: 'Nitrogen', isCorrect: false },
  ],
}

export const q1Qd: QuestionDefinition = qd({
  id: 'qd-q1',
  responseInteractions: [q1Interaction],
})

const q1Ir: InteractionRealization = {
  id: 'ir-q1',
  interactionRef: 'q1-select',
  mechanism: 'ListSelection',
}

export const q1QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q1-web',
  questionDefinitionRef: 'qd-q1',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [q1Ir],
  rootLayout: stack([interactionBlock('ir-q1')]),
})

export const q1QfdPaper: QuestionFormDefinition = {
  ...q1QfdWeb,
  id: 'qfd-q1-paper',
  targetProfileRef: 'ConventionalPaperProfile',
}

/** M04: add a second InteractionRealization for the same QD interaction. */
export const q1QfdDuplicateIr: QuestionFormDefinition = qfd({
  id: 'qfd-q1-m04',
  questionDefinitionRef: 'qd-q1',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    q1Ir,
    {
      id: 'ir-q1-dup',
      interactionRef: 'q1-select',
      mechanism: 'ListSelection',
    },
  ],
  rootLayout: stack([interactionBlock('ir-q1'), interactionBlock('ir-q1-dup')]),
})

/** M02: root layout is an InteractionBlock instead of a ContainerElement. */
export const q1QfdInvalidRootLayout: QuestionFormDefinition = qfd({
  id: 'qfd-q1-m02',
  questionDefinitionRef: 'qd-q1',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [q1Ir],
  rootLayout: interactionBlock('ir-q1') as unknown as ContainerElement,
})

/** M03: add a free, non-template realizedInstruction reformulation. */
export const q1QfdFreeInstruction: QuestionFormDefinition = qfd({
  id: 'qfd-q1-m03',
  questionDefinitionRef: 'qd-q1',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    {
      ...q1Ir,
      realizedInstruction: 'Pick the two noble gases from the list below.',
    },
  ],
  rootLayout: stack([interactionBlock('ir-q1')]),
})

// ---------------------------------------------------------------------------
// Q2 — Ordering with two legitimate realization mechanisms
// ---------------------------------------------------------------------------

const q2Interaction: ResponseInteraction = {
  id: 'q2-order',
  code: 'Q2_ORDER',
  instruction: 'Put the phases of mitosis in order from first to last.',
  type: 'Ordering',
  itemOrderPolicy: 'Permutable',
  orderingItems: [
    { id: 'prophase', code: 'prophase', name: 'Prophase' },
    { id: 'metaphase', code: 'metaphase', name: 'Metaphase' },
    { id: 'anaphase', code: 'anaphase', name: 'Anaphase' },
    { id: 'telophase', code: 'telophase', name: 'Telophase' },
  ],
  correctOrder: ['prophase', 'metaphase', 'anaphase', 'telophase'],
}

export const q2Qd: QuestionDefinition = qd({
  id: 'qd-q2',
  responseInteractions: [q2Interaction],
})

export const q2QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q2-web',
  questionDefinitionRef: 'qd-q2',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    { id: 'ir-q2', interactionRef: 'q2-order', mechanism: 'DirectOrdering' },
  ],
  rootLayout: stack([interactionBlock('ir-q2')]),
})

export const q2QfdPaper: QuestionFormDefinition = qfd({
  id: 'qfd-q2-paper',
  questionDefinitionRef: 'qd-q2',
  targetProfileRef: 'ConventionalPaperProfile',
  interactionRealizations: [
    { id: 'ir-q2p', interactionRef: 'q2-order', mechanism: 'OrderNotation' },
  ],
  rootLayout: stack([interactionBlock('ir-q2p')]),
})

/** M06: target paper but choose DirectOrdering (unsupported by ConventionalPaperProfile). */
export const q2QfdPaperInvalidMechanism: QuestionFormDefinition = qfd({
  id: 'qfd-q2-m06',
  questionDefinitionRef: 'qd-q2',
  targetProfileRef: 'ConventionalPaperProfile',
  interactionRealizations: [
    { id: 'ir-q2m06', interactionRef: 'q2-order', mechanism: 'DirectOrdering' },
  ],
  rootLayout: stack([interactionBlock('ir-q2m06')]),
})

// ---------------------------------------------------------------------------
// Q3 — Relating with Fixed element order and Text Context
// ---------------------------------------------------------------------------

const q3Stimulus: Stimulus = {
  id: 'q3-text',
  code: 'q3-text',
  type: 'Text',
  description: 'Reference paragraph about European capitals',
  materializationPolicy: 'Fixed',
  content:
    'France has Paris as its capital. Italy has Rome as its capital. Spain has Madrid as its capital.',
}

const q3Interaction: ResponseInteraction = {
  id: 'q3-relate',
  code: 'Q3_RELATE',
  instruction: 'Match each country to its capital.',
  type: 'Relating',
  mappingType: 'OneToOne',
  sourceParticipationPolicy: 'Required',
  sourceSet: {
    code: 'countries',
    name: 'Countries',
    elementOrderPolicy: 'Fixed',
    relatingElements: [
      { id: 'france', code: 'france', name: 'France' },
      { id: 'italy', code: 'italy', name: 'Italy' },
      { id: 'spain', code: 'spain', name: 'Spain' },
    ],
  },
  targetSet: {
    code: 'capitals',
    name: 'Capitals',
    elementOrderPolicy: 'Fixed',
    relatingElements: [
      { id: 'paris', code: 'paris', name: 'Paris' },
      { id: 'rome', code: 'rome', name: 'Rome' },
      { id: 'madrid', code: 'madrid', name: 'Madrid' },
    ],
  },
  correctRelations: [
    { sourceElementRef: 'france', targetElementRef: 'paris' },
    { sourceElementRef: 'italy', targetElementRef: 'rome' },
    { sourceElementRef: 'spain', targetElementRef: 'madrid' },
  ],
}

export const q3Qd: QuestionDefinition = qd({
  id: 'qd-q3',
  responseInteractions: [q3Interaction],
  stimuli: [q3Stimulus],
  interactionStimulusAssociations: [
    {
      id: 'assoc-q3',
      interactionRef: 'q3-relate',
      stimulusRef: 'q3-text',
      role: 'Context',
    },
  ],
})

const q3SrWeb: StimulusRealization = {
  id: 'sr-q3',
  stimulusRef: 'q3-text',
  mode: 'ReuseSource',
}

export const q3QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q3-web',
  questionDefinitionRef: 'qd-q3',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    {
      id: 'ir-q3',
      interactionRef: 'q3-relate',
      mechanism: 'DirectRelationConstruction',
    },
  ],
  stimulusRealizations: [q3SrWeb],
  rootLayout: {
    kind: 'Grid',
    rows: 2,
    columns: 1,
    items: [
      {
        child: stimulusBlock('sr-q3'),
        row: 0,
        column: 0,
        rowSpan: 1,
        columnSpan: 1,
      },
      {
        child: interactionBlock('ir-q3'),
        row: 1,
        column: 0,
        rowSpan: 1,
        columnSpan: 1,
      },
    ],
  },
})

export const q3QfdPaper: QuestionFormDefinition = qfd({
  id: 'qfd-q3-paper',
  questionDefinitionRef: 'qd-q3',
  targetProfileRef: 'ConventionalPaperProfile',
  interactionRealizations: [
    {
      id: 'ir-q3p',
      interactionRef: 'q3-relate',
      mechanism: 'RelationNotation',
    },
  ],
  stimulusRealizations: [
    { id: 'sr-q3p', stimulusRef: 'q3-text', mode: 'ReuseSource' },
  ],
  rootLayout: {
    kind: 'Grid',
    rows: 2,
    columns: 1,
    items: [
      {
        child: stimulusBlock('sr-q3p'),
        row: 0,
        column: 0,
        rowSpan: 1,
        columnSpan: 1,
      },
      {
        child: interactionBlock('ir-q3p'),
        row: 1,
        column: 0,
        rowSpan: 1,
        columnSpan: 1,
      },
    ],
  },
})

/** M08: preserve element identities but reverse the Fixed source-set presentation order. */
export const q3QfdReversedFixedOrder: QuestionFormDefinition = qfd({
  id: 'qfd-q3-m08',
  questionDefinitionRef: 'qd-q3',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    {
      id: 'ir-q3m08',
      interactionRef: 'q3-relate',
      mechanism: 'DirectRelationConstruction',
    },
  ],
  stimulusRealizations: [
    { id: 'sr-q3m08', stimulusRef: 'q3-text', mode: 'ReuseSource' },
  ],
  rootLayout: stack([
    stimulusBlock('sr-q3m08'),
    {
      kind: 'Grid',
      rows: 1,
      columns: 3,
      items: [
        {
          child: responseElementBlock('RelatingElement', 'spain'),
          row: 0,
          column: 0,
          rowSpan: 1,
          columnSpan: 1,
        },
        {
          child: responseElementBlock('RelatingElement', 'italy'),
          row: 0,
          column: 1,
          rowSpan: 1,
          columnSpan: 1,
        },
        {
          child: responseElementBlock('RelatingElement', 'france'),
          row: 0,
          column: 2,
          rowSpan: 1,
          columnSpan: 1,
        },
      ],
    },
    interactionBlock('ir-q3m08'),
  ]),
})

// ---------------------------------------------------------------------------
// Q4 — Completing in local content with reusable items
// ---------------------------------------------------------------------------

const q4Interaction: ResponseInteraction = {
  id: 'q4-complete',
  code: 'Q4_COMPLETE',
  instruction: 'Complete the sentences below.',
  type: 'Completing',
  localContent:
    'During photosynthesis, plants take in {{gap-1}} and release {{gap-2}}.',
  completingItems: [
    {
      id: 'co2',
      code: 'co2',
      type: 'TextCompletingItem',
      text: 'carbon dioxide',
      usageLimit: 1,
    },
    {
      id: 'o2',
      code: 'o2',
      type: 'TextCompletingItem',
      text: 'oxygen',
      usageLimit: 1,
    },
    {
      id: 'n2',
      code: 'n2',
      type: 'TextCompletingItem',
      text: 'nitrogen',
      usageLimit: 1,
    },
  ],
  completingGaps: [
    {
      id: 'gap-1',
      code: 'gap-1',
      type: 'DropTargetGap',
      anchor: { kind: 'TextAnchor', marker: '{{gap-1}}' },
      correctItemRefs: ['co2'],
    },
    {
      id: 'gap-2',
      code: 'gap-2',
      type: 'DropTargetGap',
      anchor: { kind: 'TextAnchor', marker: '{{gap-2}}' },
      correctItemRefs: ['o2'],
    },
  ],
}

export const q4Qd: QuestionDefinition = qd({
  id: 'qd-q4',
  responseInteractions: [q4Interaction],
})

export const q4QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q4-web',
  questionDefinitionRef: 'qd-q4',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    { id: 'ir-q4', interactionRef: 'q4-complete', mechanism: 'Completion' },
  ],
  rootLayout: {
    kind: 'Inline',
    items: [{ child: interactionBlock('ir-q4') }],
  } as Inline,
})

export const q4QfdPaper: QuestionFormDefinition = {
  ...q4QfdWeb,
  id: 'qfd-q4-paper',
  targetProfileRef: 'ConventionalPaperProfile',
}

// ---------------------------------------------------------------------------
// Q5 — ShortInput with Audio Context
// ---------------------------------------------------------------------------

const q5Stimulus: Stimulus = {
  id: 'q5-audio',
  code: 'q5-audio',
  type: 'Audio',
  description: 'Three tones',
  materializationPolicy: 'Fixed',
  source: '/q5-three-tones.wav',
}

const q5Interaction: ResponseInteraction = {
  id: 'q5-short',
  code: 'Q5_SHORT',
  instruction: 'How many tones do you hear? Enter a whole number.',
  type: 'ShortInput',
  inputType: 'Number',
  correctValues: [3],
  minValue: 0,
  maxValue: 10,
}

export const q5Qd: QuestionDefinition = qd({
  id: 'qd-q5',
  responseInteractions: [q5Interaction],
  stimuli: [q5Stimulus],
  interactionStimulusAssociations: [
    {
      id: 'assoc-q5',
      interactionRef: 'q5-short',
      stimulusRef: 'q5-audio',
      role: 'Context',
    },
  ],
})

export const q5QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q5-web',
  questionDefinitionRef: 'qd-q5',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    { id: 'ir-q5', interactionRef: 'q5-short', mechanism: 'ShortEntry' },
  ],
  stimulusRealizations: [
    { id: 'sr-q5', stimulusRef: 'q5-audio', mode: 'ReuseSource' },
  ],
  rootLayout: stack([stimulusBlock('sr-q5'), interactionBlock('ir-q5')]),
})

/** Same semantic QFD structure retargeted at the paper profile (protocol: feasibility INFEASIBLE via PROF-STM-001). */
export const q5QfdPaper: QuestionFormDefinition = {
  ...q5QfdWeb,
  id: 'qfd-q5-paper',
  targetProfileRef: 'ConventionalPaperProfile',
}

// ---------------------------------------------------------------------------
// Q6 — Essay with Video Context
// ---------------------------------------------------------------------------

const q6Stimulus: Stimulus = {
  id: 'q6-video',
  code: 'q6-video',
  type: 'Video',
  description: 'Ball moving left to right',
  materializationPolicy: 'Fixed',
  source: '/q6-motion.mp4',
}

const q6Interaction: ResponseInteraction = {
  id: 'q6-essay',
  code: 'Q6_ESSAY',
  instruction: 'In 20–50 words, describe the motion shown in the video.',
  type: 'Essay',
  minLength: 20,
  maxLength: 50,
  lengthUnit: 'Words',
}

export const q6Qd: QuestionDefinition = qd({
  id: 'qd-q6',
  responseInteractions: [q6Interaction],
  stimuli: [q6Stimulus],
  interactionStimulusAssociations: [
    {
      id: 'assoc-q6',
      interactionRef: 'q6-essay',
      stimulusRef: 'q6-video',
      role: 'Context',
    },
  ],
})

export const q6QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q6-web',
  questionDefinitionRef: 'qd-q6',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    { id: 'ir-q6', interactionRef: 'q6-essay', mechanism: 'ExtendedTextEntry' },
  ],
  stimulusRealizations: [
    { id: 'sr-q6', stimulusRef: 'q6-video', mode: 'ReuseSource' },
  ],
  rootLayout: stack([stimulusBlock('sr-q6'), interactionBlock('ir-q6')]),
})

export const q6QfdPaper: QuestionFormDefinition = {
  ...q6QfdWeb,
  id: 'qfd-q6-paper',
  targetProfileRef: 'ConventionalPaperProfile',
}

// ---------------------------------------------------------------------------
// Q7 — ArtifactSubmission across digital and physical media
// ---------------------------------------------------------------------------

const q7Interaction: ResponseInteraction = {
  id: 'q7-artifact',
  code: 'Q7_ARTIFACT',
  instruction:
    'Produce one concept map showing the relationships among photosynthesis inputs, outputs, and energy flow.',
  type: 'ArtifactSubmission',
  minArtifacts: 1,
  maxArtifacts: 1,
  artifactSpecification:
    'One concept map showing photosynthesis inputs, outputs, and energy flow.',
}

export const q7Qd: QuestionDefinition = qd({
  id: 'qd-q7',
  responseInteractions: [q7Interaction],
})

export const q7QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q7-web',
  questionDefinitionRef: 'qd-q7',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    {
      id: 'ir-q7',
      interactionRef: 'q7-artifact',
      mechanism: 'DigitalArtifactSubmission',
    },
  ],
  rootLayout: stack([interactionBlock('ir-q7')]),
})

export const q7QfdPaper: QuestionFormDefinition = qfd({
  id: 'qfd-q7-paper',
  questionDefinitionRef: 'qd-q7',
  targetProfileRef: 'ConventionalPaperProfile',
  interactionRealizations: [
    {
      id: 'ir-q7p',
      interactionRef: 'q7-artifact',
      mechanism: 'PhysicalArtifactSubmission',
    },
  ],
  rootLayout: stack([interactionBlock('ir-q7p')]),
})

/** M14: paper profile + DigitalArtifactSubmission. */
export const q7QfdPaperInvalidMechanism: QuestionFormDefinition = qfd({
  id: 'qfd-q7-m14',
  questionDefinitionRef: 'qd-q7',
  targetProfileRef: 'ConventionalPaperProfile',
  interactionRealizations: [
    {
      id: 'ir-q7m14',
      interactionRef: 'q7-artifact',
      mechanism: 'DigitalArtifactSubmission',
    },
  ],
  rootLayout: stack([interactionBlock('ir-q7m14')]),
})

/** M15: web profile + PhysicalArtifactSubmission. */
export const q7QfdWebInvalidMechanism: QuestionFormDefinition = qfd({
  id: 'qfd-q7-m15',
  questionDefinitionRef: 'qd-q7',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    {
      id: 'ir-q7m15',
      interactionRef: 'q7-artifact',
      mechanism: 'PhysicalArtifactSubmission',
    },
  ],
  rootLayout: stack([interactionBlock('ir-q7m15')]),
})

// ---------------------------------------------------------------------------
// Q8A — Point marking over Image Workspace
// ---------------------------------------------------------------------------

const q8aStimulus: Stimulus = {
  id: 'q8a-image',
  code: 'q8a-image',
  type: 'Image',
  description: 'Triangle, circle, square',
  materializationPolicy: 'Fixed',
  source: '/q8-shapes.png',
}

const q8aInteraction: ResponseInteraction = {
  id: 'q8a-mark',
  code: 'Q8A_MARK',
  instruction: 'Place one point inside the circle.',
  type: 'Marking',
  markType: 'Point',
  minMarks: 1,
  maxMarks: 1,
}

export const q8aQd: QuestionDefinition = qd({
  id: 'qd-q8a',
  responseInteractions: [q8aInteraction],
  stimuli: [q8aStimulus],
  interactionStimulusAssociations: [
    {
      id: 'assoc-q8a',
      interactionRef: 'q8a-mark',
      stimulusRef: 'q8a-image',
      role: 'Workspace',
    },
  ],
})

function markingQfd(
  id: string,
  profileId: 'InteractiveWebProfile' | 'ConventionalPaperProfile',
  qdId: string,
  interactionRef: string,
  stimulusRef: string
): QuestionFormDefinition {
  const ir = {
    id: `ir-${id}`,
    interactionRef,
    mechanism: 'DirectMarking' as const,
  }
  const sr = { id: `sr-${id}`, stimulusRef, mode: 'ReuseSource' as const }
  const canvas: Canvas = {
    kind: 'Canvas',
    items: [
      {
        child: interactionBlock(ir.id),
        area: { x: 0, y: 0, width: 1, height: 1 },
        layer: 0,
      },
      {
        child: stimulusBlock(sr.id),
        area: { x: 0, y: 0, width: 1, height: 1 },
        layer: 1,
      },
    ],
  }
  return qfd({
    id,
    questionDefinitionRef: qdId,
    targetProfileRef: profileId,
    interactionRealizations: [ir],
    stimulusRealizations: [sr],
    rootLayout: canvas,
  })
}

export const q8aQfdWeb: QuestionFormDefinition = markingQfd(
  'qfd-q8a-web',
  'InteractiveWebProfile',
  'qd-q8a',
  'q8a-mark',
  'q8a-image'
)
export const q8aQfdPaper: QuestionFormDefinition = markingQfd(
  'qfd-q8a-paper',
  'ConventionalPaperProfile',
  'qd-q8a',
  'q8a-mark',
  'q8a-image'
)

// ---------------------------------------------------------------------------
// Q8B — TextSpan marking over Text Workspace
// ---------------------------------------------------------------------------

const q8bStimulus: Stimulus = {
  id: 'q8b-text',
  code: 'q8b-text',
  type: 'Text',
  description: 'Sentence',
  materializationPolicy: 'Fixed',
  content: 'The enzyme catalyzes the reaction rapidly.',
}

const q8bInteraction: ResponseInteraction = {
  id: 'q8b-mark',
  code: 'Q8B_MARK',
  instruction: 'Mark the verb phrase in the sentence.',
  type: 'Marking',
  markType: 'TextSpan',
  minMarks: 1,
  maxMarks: 1,
}

export const q8bQd: QuestionDefinition = qd({
  id: 'qd-q8b',
  responseInteractions: [q8bInteraction],
  stimuli: [q8bStimulus],
  interactionStimulusAssociations: [
    {
      id: 'assoc-q8b',
      interactionRef: 'q8b-mark',
      stimulusRef: 'q8b-text',
      role: 'Workspace',
    },
  ],
})

function inlineMarkingQfd(
  id: string,
  profileId: 'InteractiveWebProfile' | 'ConventionalPaperProfile'
): QuestionFormDefinition {
  const ir = {
    id: `ir-${id}`,
    interactionRef: 'q8b-mark',
    mechanism: 'DirectMarking' as const,
  }
  const sr = {
    id: `sr-${id}`,
    stimulusRef: 'q8b-text',
    mode: 'ReuseSource' as const,
  }
  const inline: Inline = {
    kind: 'Inline',
    items: [
      { child: stimulusBlock(sr.id) },
      { child: interactionBlock(ir.id) },
    ],
  }
  return qfd({
    id,
    questionDefinitionRef: 'qd-q8b',
    targetProfileRef: profileId,
    interactionRealizations: [ir],
    stimulusRealizations: [sr],
    rootLayout: inline,
  })
}

export const q8bQfdWeb: QuestionFormDefinition = inlineMarkingQfd(
  'qfd-q8b-web',
  'InteractiveWebProfile'
)
export const q8bQfdPaper: QuestionFormDefinition = inlineMarkingQfd(
  'qfd-q8b-paper',
  'ConventionalPaperProfile'
)

/** M16 (QD-level, MRK-003 FAIL) is exercised in QD fixtures; this variant additionally shows the
 * downstream effect: an invalid QD Point/Text pairing conformance cannot meaningfully evaluate. */

// ---------------------------------------------------------------------------
// Q9 — Selecting over Image Workspace with semantic-review boundary
// ---------------------------------------------------------------------------

const q9Stimulus: Stimulus = {
  id: 'q9-image',
  code: 'q9-image',
  type: 'Image',
  description: 'Triangle, circle, square',
  materializationPolicy: 'Fixed',
  source: '/q9-three-shapes.png',
}

const q9Interaction: ResponseInteraction = {
  id: 'q9-spatial-select',
  code: 'Q9_SPATIAL_SELECT',
  instruction: 'Select the circle.',
  type: 'Selecting',
  minSelections: 1,
  maxSelections: 1,
  itemOrderPolicy: 'Fixed',
  choices: [
    { id: 'triangle', code: 'triangle', name: 'Triangle', isCorrect: false },
    { id: 'circle', code: 'circle', name: 'Circle', isCorrect: true },
    { id: 'square', code: 'square', name: 'Square', isCorrect: false },
  ],
}

export const q9Qd: QuestionDefinition = qd({
  id: 'qd-q9',
  responseInteractions: [q9Interaction],
  stimuli: [q9Stimulus],
  interactionStimulusAssociations: [
    {
      id: 'assoc-q9',
      interactionRef: 'q9-spatial-select',
      stimulusRef: 'q9-image',
      role: 'Workspace',
    },
  ],
})

function q9Canvas(includeAll: boolean, includeForeign: boolean): Canvas {
  const items = [
    {
      child: interactionBlock('ir-q9'),
      area: { x: 0, y: 0, width: 1, height: 1 },
      layer: 0,
    },
    {
      child: stimulusBlock('sr-q9'),
      area: { x: 0, y: 0, width: 1, height: 1 },
      layer: 1,
    },
    {
      child: responseElementBlock('Choice', 'triangle'),
      area: { x: 0.05, y: 0.2, width: 0.25, height: 0.5 },
      layer: 2,
    },
    {
      child: responseElementBlock('Choice', 'circle'),
      area: { x: 0.375, y: 0.2, width: 0.25, height: 0.5 },
      layer: 2,
    },
    ...(includeAll
      ? [
          {
            child: responseElementBlock('Choice', 'square'),
            area: { x: 0.7, y: 0.2, width: 0.25, height: 0.5 },
            layer: 2,
          },
        ]
      : []),
    ...(includeForeign
      ? [
          {
            child: responseElementBlock('Choice', 'he'),
            area: { x: 0.7, y: 0.2, width: 0.25, height: 0.5 },
            layer: 2,
          },
        ]
      : []),
  ]
  return { kind: 'Canvas', items }
}

export const q9QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q9-web',
  questionDefinitionRef: 'qd-q9',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    {
      id: 'ir-q9',
      interactionRef: 'q9-spatial-select',
      mechanism: 'SpatialSelection',
    },
  ],
  stimulusRealizations: [
    { id: 'sr-q9', stimulusRef: 'q9-image', mode: 'ReuseSource' },
  ],
  rootLayout: q9Canvas(true, false),
})

export const q9QfdPaper: QuestionFormDefinition = {
  ...q9QfdWeb,
  id: 'qfd-q9-paper',
  targetProfileRef: 'ConventionalPaperProfile',
}

/** M18: omit concrete placement for one required Choice (square). */
export const q9QfdMissingChoicePlacement: QuestionFormDefinition = qfd({
  id: 'qfd-q9-m18',
  questionDefinitionRef: 'qd-q9',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    {
      id: 'ir-q9m18',
      interactionRef: 'q9-spatial-select',
      mechanism: 'SpatialSelection',
    },
  ],
  stimulusRealizations: [
    { id: 'sr-q9m18', stimulusRef: 'q9-image', mode: 'ReuseSource' },
  ],
  rootLayout: {
    kind: 'Canvas',
    items: [
      {
        child: interactionBlock('ir-q9m18'),
        area: { x: 0, y: 0, width: 1, height: 1 },
        layer: 0,
      },
      {
        child: stimulusBlock('sr-q9m18'),
        area: { x: 0, y: 0, width: 1, height: 1 },
        layer: 1,
      },
      {
        child: responseElementBlock('Choice', 'triangle'),
        area: { x: 0.05, y: 0.2, width: 0.25, height: 0.5 },
        layer: 2,
      },
      {
        child: responseElementBlock('Choice', 'circle'),
        area: { x: 0.375, y: 0.2, width: 0.25, height: 0.5 },
        layer: 2,
      },
    ],
  },
})

/** M19: include all Choices but add a foreign Choice (from Q1) as if owned by Q9. */
export const q9QfdForeignChoice: QuestionFormDefinition = qfd({
  id: 'qfd-q9-m19',
  questionDefinitionRef: 'qd-q9',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    {
      id: 'ir-q9m19',
      interactionRef: 'q9-spatial-select',
      mechanism: 'SpatialSelection',
    },
  ],
  stimulusRealizations: [
    { id: 'sr-q9m19', stimulusRef: 'q9-image', mode: 'ReuseSource' },
  ],
  rootLayout: (() => {
    const c = q9Canvas(true, true)
    return {
      kind: 'Canvas',
      items: c.items.map((i) =>
        i.child.kind === 'StimulusBlock'
          ? { ...i, child: stimulusBlock('sr-q9m19') }
          : i.child.kind === 'InteractionBlock'
            ? { ...i, child: interactionBlock('ir-q9m19') }
            : i
      ),
    } as Canvas
  })(),
})

// ---------------------------------------------------------------------------
// Q10 — SpecificationBased Completing over Image Workspace
// ---------------------------------------------------------------------------

const q10Stimulus: Stimulus = {
  id: 'q10-heart-spec',
  code: 'q10-heart-spec',
  type: 'Image',
  description: 'Schematic heart diagram',
  materializationPolicy: 'SpecificationBased',
  contentSpecification:
    'A clear schematic human-heart diagram in which the four chambers are visually distinguishable and can each receive one label.',
}

const q10GapSpecs = [
  {
    id: 'gap-la',
    code: 'gap-la',
    itemId: 'left-atrium',
    spec: 'the left atrium chamber',
  },
  {
    id: 'gap-ra',
    code: 'gap-ra',
    itemId: 'right-atrium',
    spec: 'the right atrium chamber',
  },
  {
    id: 'gap-lv',
    code: 'gap-lv',
    itemId: 'left-ventricle',
    spec: 'the left ventricle chamber',
  },
  {
    id: 'gap-rv',
    code: 'gap-rv',
    itemId: 'right-ventricle',
    spec: 'the right ventricle chamber',
  },
]

/** Normalized (image-relative) drop-target regions for the four heart chambers
 * in `materialized-heart-diagram.png`: atria across the top, ventricles below,
 * left/right split by the heart's vertical midline. */
const q10GapAreas: Record<
  string,
  { x: number; y: number; width: number; height: number }
> = {
  'gap-la': { x: 0.2, y: 0.42, width: 0.2, height: 0.06 }, // left atrium (top-left)
  'gap-ra': { x: 0.6, y: 0.42, width: 0.2, height: 0.06 }, // right atrium (top-right)
  'gap-lv': { x: 0.15, y: 0.73, width: 0.2, height: 0.06 }, // left ventricle (bottom-left)
  'gap-rv': { x: 0.6, y: 0.73, width: 0.2, height: 0.06 }, // right ventricle (bottom-right)
}

const q10Interaction: ResponseInteraction = {
  id: 'q10-heart-complete',
  code: 'Q10_HEART_COMPLETE',
  instruction:
    'Complete the diagram by placing the four chamber labels in the correct positions.',
  type: 'Completing',
  completingItems: [
    {
      id: 'left-atrium',
      code: 'left-atrium',
      type: 'TextCompletingItem',
      text: 'Left atrium',
      usageLimit: 1,
    },
    {
      id: 'right-atrium',
      code: 'right-atrium',
      type: 'TextCompletingItem',
      text: 'Right atrium',
      usageLimit: 1,
    },
    {
      id: 'left-ventricle',
      code: 'left-ventricle',
      type: 'TextCompletingItem',
      text: 'Left ventricle',
      usageLimit: 1,
    },
    {
      id: 'right-ventricle',
      code: 'right-ventricle',
      type: 'TextCompletingItem',
      text: 'Right ventricle',
      usageLimit: 1,
    },
  ],
  completingGaps: q10GapSpecs.map((g) => ({
    id: g.id,
    code: g.code,
    type: 'DropTargetGap' as const,
    stimulusRef: 'q10-heart-spec',
    placementSpecification: g.spec,
    correctItemRefs: [g.itemId],
  })),
}

export const q10Qd: QuestionDefinition = qd({
  id: 'qd-q10',
  responseInteractions: [q10Interaction],
  stimuli: [q10Stimulus],
  interactionStimulusAssociations: [
    {
      id: 'assoc-q10',
      interactionRef: 'q10-heart-complete',
      stimulusRef: 'q10-heart-spec',
      role: 'Workspace',
    },
  ],
})

function q10Layout(concretePlacements: boolean): Canvas {
  const items = [
    {
      child: interactionBlock('ir-q10'),
      area: { x: 0, y: 0, width: 1, height: 1 },
      layer: 0,
    },
    {
      child: stimulusBlock('sr-q10'),
      area: { x: 0, y: 0, width: 1, height: 1 },
      layer: 1,
    },
    ...(concretePlacements
      ? q10GapSpecs.map((g) => ({
          child: responseElementBlock('CompletingGap', g.id),
          area: q10GapAreas[g.id],
          layer: 2,
        }))
      : []),
  ]
  return { kind: 'Canvas', items }
}

export const q10QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q10-web',
  questionDefinitionRef: 'qd-q10',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    {
      id: 'ir-q10',
      interactionRef: 'q10-heart-complete',
      mechanism: 'Completion',
    },
  ],
  stimulusRealizations: [
    {
      id: 'sr-q10',
      stimulusRef: 'q10-heart-spec',
      mode: 'MaterializeFromSpecification',
      realizedContent: '/materialized-heart-diagram.png',
    },
  ],
  rootLayout: q10Layout(true),
})

export const q10QfdPaper: QuestionFormDefinition = {
  ...q10QfdWeb,
  id: 'qfd-q10-paper',
  targetProfileRef: 'ConventionalPaperProfile',
}

/** M21: use ReuseSource for the SpecificationBased stimulus. */
export const q10QfdReuseSourceInvalid: QuestionFormDefinition = {
  ...q10QfdWeb,
  id: 'qfd-q10-m21',
  stimulusRealizations: [
    { id: 'sr-q10m21', stimulusRef: 'q10-heart-spec', mode: 'ReuseSource' },
  ],
  rootLayout: (() => {
    const layout = q10Layout(true)
    return {
      kind: 'Canvas',
      items: layout.items.map((i) =>
        i.child.kind === 'StimulusBlock'
          ? { ...i, child: stimulusBlock('sr-q10m21') }
          : i
      ),
    } as Canvas
  })(),
}

/** M22: materialize the stimulus but omit all concrete QFD gap placements. */
export const q10QfdMissingGapPlacements: QuestionFormDefinition = {
  ...q10QfdWeb,
  id: 'qfd-q10-m22',
  interactionRealizations: [
    {
      id: 'ir-q10m22',
      interactionRef: 'q10-heart-complete',
      mechanism: 'Completion',
    },
  ],
  stimulusRealizations: [
    {
      id: 'sr-q10m22',
      stimulusRef: 'q10-heart-spec',
      mode: 'MaterializeFromSpecification',
      realizedContent: '/materialized-heart-diagram.png',
    },
  ],
  rootLayout: {
    kind: 'Canvas',
    items: [
      {
        child: interactionBlock('ir-q10m22'),
        area: { x: 0, y: 0, width: 1, height: 1 },
        layer: 0,
      },
      {
        child: stimulusBlock('sr-q10m22'),
        area: { x: 0, y: 0, width: 1, height: 1 },
        layer: 1,
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Q11 — Adaptable Image Context
// ---------------------------------------------------------------------------

const q11Stimulus: Stimulus = {
  id: 'q11-chart',
  code: 'q11-chart',
  type: 'Image',
  description: 'Bar chart of yearly values',
  materializationPolicy: 'Adaptable',
  source: '/q11-chart-source.png',
  contentSpecification:
    'Preserve the three year labels, the values 40/60/50, their year-value mapping, and enough axis/scale information for the values to be interpreted correctly.',
}

const q11Interaction: ResponseInteraction = {
  id: 'q11-short',
  code: 'Q11_SHORT',
  instruction: 'What value does the chart show for 2020?',
  type: 'ShortInput',
  inputType: 'Number',
  correctValues: [60],
}

export const q11Qd: QuestionDefinition = qd({
  id: 'qd-q11',
  responseInteractions: [q11Interaction],
  stimuli: [q11Stimulus],
  interactionStimulusAssociations: [
    {
      id: 'assoc-q11',
      interactionRef: 'q11-short',
      stimulusRef: 'q11-chart',
      role: 'Context',
    },
  ],
})

export const q11QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q11-web',
  questionDefinitionRef: 'qd-q11',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    { id: 'ir-q11', interactionRef: 'q11-short', mechanism: 'ShortEntry' },
  ],
  stimulusRealizations: [
    {
      id: 'sr-q11',
      stimulusRef: 'q11-chart',
      mode: 'AdaptSource',
      realizedContent: '/adapted-chart-2020-highlighted.png',
    },
  ],
  rootLayout: stack([stimulusBlock('sr-q11'), interactionBlock('ir-q11')]),
})

export const q11QfdPaper: QuestionFormDefinition = {
  ...q11QfdWeb,
  id: 'qfd-q11-paper',
  targetProfileRef: 'ConventionalPaperProfile',
}

/** M17 (applied to Q8A's Fixed image): Fixed image realized with AdaptSource + realizedContent. */
export const q8aQfdInvalidAdaptFixed: QuestionFormDefinition = {
  ...q8aQfdWeb,
  id: 'qfd-q8a-m17',
  stimulusRealizations: [
    {
      id: 'sr-q8a-m17',
      stimulusRef: 'q8a-image',
      mode: 'AdaptSource',
      realizedContent: '/adapted-shapes.png',
    },
  ],
  rootLayout: {
    kind: 'Canvas',
    items: [
      {
        child: stimulusBlock('sr-q8a-m17'),
        area: { x: 0, y: 0, width: 1, height: 1 },
        layer: 0,
      },
      {
        child: interactionBlock('ir-qfd-q8a-web'),
        area: { x: 0, y: 0, width: 1, height: 1 },
        layer: 1,
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Q12 — Multi-interaction sequence and dependency
// ---------------------------------------------------------------------------

const q12I1: ResponseInteraction = {
  id: 'i1',
  code: 'I1',
  instruction: 'What is 2 + 3?',
  type: 'ShortInput',
  inputType: 'Number',
  correctValues: [5],
}
const q12I2: ResponseInteraction = {
  id: 'i2',
  code: 'I2',
  instruction: 'Select the even number.',
  type: 'Selecting',
  minSelections: 1,
  maxSelections: 1,
  itemOrderPolicy: 'Permutable',
  choices: [
    { id: 'i2-3', code: '3', name: '3', isCorrect: false },
    { id: 'i2-4', code: '4', name: '4', isCorrect: true },
    { id: 'i2-5', code: '5', name: '5', isCorrect: false },
  ],
}
const q12I3: ResponseInteraction = {
  id: 'i3',
  code: 'I3',
  type: 'Essay',
  instruction: 'Briefly explain how you identified the even number.',
}

const q12Constraints: QuestionConstraint[] = [
  {
    id: 'd1',
    type: 'Dependency',
    strength: 'Required',
    predecessorInteractionRef: 'i1',
    successorInteractionRef: 'i2',
    rule: 'RequiresCorrectness',
  },
  {
    id: 's1',
    type: 'Sequence',
    strength: 'Required',
    interactionRefs: ['i2', 'i3'],
  },
]

export const q12Qd: QuestionDefinition = qd({
  id: 'qd-q12',
  responseInteractions: [q12I1, q12I2, q12I3],
  constraints: q12Constraints,
})

export const q12QfdWeb: QuestionFormDefinition = qfd({
  id: 'qfd-q12-web',
  questionDefinitionRef: 'qd-q12',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    { id: 'ir-i1', interactionRef: 'i1', mechanism: 'ShortEntry' },
    { id: 'ir-i2', interactionRef: 'i2', mechanism: 'ListSelection' },
    { id: 'ir-i3', interactionRef: 'i3', mechanism: 'ExtendedTextEntry' },
  ],
  rootLayout: stack([
    interactionBlock('ir-i1'),
    interactionBlock('ir-i2'),
    interactionBlock('ir-i3'),
  ]),
})

export const q12QfdPaper: QuestionFormDefinition = {
  ...q12QfdWeb,
  id: 'qfd-q12-paper',
  targetProfileRef: 'ConventionalPaperProfile',
}

/** M25: layout order I1, I3, I2 — Required Sequence [I2,I3] is now violated. */
export const q12QfdWrongOrder: QuestionFormDefinition = qfd({
  id: 'qfd-q12-m25',
  questionDefinitionRef: 'qd-q12',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    { id: 'ir-i1-m25', interactionRef: 'i1', mechanism: 'ShortEntry' },
    { id: 'ir-i2-m25', interactionRef: 'i2', mechanism: 'ListSelection' },
    { id: 'ir-i3-m25', interactionRef: 'i3', mechanism: 'ExtendedTextEntry' },
  ],
  rootLayout: stack([
    interactionBlock('ir-i1-m25'),
    interactionBlock('ir-i3-m25'),
    interactionBlock('ir-i2-m25'),
  ]),
})

/** M28: S1 becomes Preferred; layout order I1, I3, I2; Required dependency I1->I2 still satisfied. */
export const q12QdPreferredSequence: QuestionDefinition = qd({
  id: 'qd-q12-m28',
  responseInteractions: [q12I1, q12I2, q12I3],
  constraints: [
    {
      id: 'd1-m28',
      type: 'Dependency',
      strength: 'Required',
      predecessorInteractionRef: 'i1',
      successorInteractionRef: 'i2',
      rule: 'RequiresCorrectness',
    },
    {
      id: 's1-m28',
      type: 'Sequence',
      strength: 'Preferred',
      interactionRefs: ['i2', 'i3'],
    },
  ],
})

export const q12QfdPreferredSequenceWrongOrder: QuestionFormDefinition = qfd({
  id: 'qfd-q12-m28',
  questionDefinitionRef: 'qd-q12-m28',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    { id: 'ir-i1-m28', interactionRef: 'i1', mechanism: 'ShortEntry' },
    { id: 'ir-i2-m28', interactionRef: 'i2', mechanism: 'ListSelection' },
    { id: 'ir-i3-m28', interactionRef: 'i3', mechanism: 'ExtendedTextEntry' },
  ],
  rootLayout: stack([
    interactionBlock('ir-i1-m28'),
    interactionBlock('ir-i3-m28'),
    interactionBlock('ir-i2-m28'),
  ]),
})

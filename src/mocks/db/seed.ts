import type {
  InteractionStimulusAssociation,
  QuestionConstraint,
  QuestionDefinition,
  QuestionStatus,
  ResponseInteraction,
  Stimulus,
} from '@/domain/qd/model'

import {
  q1Qd,
  q2Qd,
  q3Qd,
  q4Qd,
  q5Qd,
  q6Qd,
  q7Qd,
  q8aQd,
  q8bQd,
  q9Qd,
  q10Qd,
  q11Qd,
  q12Qd,
} from '@/domain/qfd/fixtures/qfdFixtures'

// ─── Stored types (no circular references — safe for localStorage serialization) ─

export interface StoredCategory {
  id: string
  name: string
  order: number
}

export interface StoredCategorization {
  id: string
  name: string
  isExclusive: boolean
  categories: StoredCategory[]
}

/** The QuestionDefinition aggregate as persisted by the mock backend: stimuli,
 * interactions, associations and constraints are stored inline as owned parts. */
export interface StoredQuestion {
  id: string
  shortDescription: string
  longDescription: string
  status: QuestionStatus
  categoryIds: string[]
  stimuli: Stimulus[]
  responseInteractions: ResponseInteraction[]
  interactionStimulusAssociations: InteractionStimulusAssociation[]
  constraints: QuestionConstraint[]
}

// ─── Fixed IDs (deterministic across reloads) ─────────────────────────────────

export const SEED_IDS = {
  SUBJECT: 'seed-cat-subject',
  MATH: 'seed-cat-math',
  PHYSICS: 'seed-cat-physics',
  CHEMISTRY: 'seed-cat-chemistry',
  DIFFICULTY: 'seed-cat-difficulty',
  EASY: 'seed-cat-easy',
  MEDIUM: 'seed-cat-medium',
  HARD: 'seed-cat-hard',
  GRADE: 'seed-cat-grade',
  GRADE7: 'seed-cat-grade7',
  GRADE8: 'seed-cat-grade8',
  GRADE9: 'seed-cat-grade9',
} as const

// ─── Seed data ─────────────────────────────────────────────────────────────────

export const seedCategorizations: StoredCategorization[] = [
  {
    id: SEED_IDS.SUBJECT,
    name: 'Subject',
    isExclusive: true,
    categories: [
      { id: SEED_IDS.MATH, name: 'Mathematics', order: 1 },
      { id: SEED_IDS.PHYSICS, name: 'Physics', order: 2 },
      { id: SEED_IDS.CHEMISTRY, name: 'Chemistry', order: 3 },
    ],
  },
  {
    id: SEED_IDS.DIFFICULTY,
    name: 'Difficulty',
    isExclusive: true,
    categories: [
      { id: SEED_IDS.EASY, name: 'Easy', order: 1 },
      { id: SEED_IDS.MEDIUM, name: 'Medium', order: 2 },
      { id: SEED_IDS.HARD, name: 'Hard', order: 3 },
    ],
  },
  {
    id: SEED_IDS.GRADE,
    name: 'Grade',
    isExclusive: false,
    categories: [
      { id: SEED_IDS.GRADE7, name: 'Grade 7', order: 1 },
      { id: SEED_IDS.GRADE8, name: 'Grade 8', order: 2 },
      { id: SEED_IDS.GRADE9, name: 'Grade 9', order: 3 },
    ],
  },
]

/** Human-readable metadata for the Q1–Q12 scenario questions. The questions
 * themselves are reused verbatim from the tested fixtures in
 * `src/domain/qfd/fixtures/qfdFixtures.ts`, so the seeded data behaves exactly
 * like the data exercised by the validation/feasibility/conformance suite. */
interface DemoQuestionMeta {
  shortDescription: string
  longDescription: string
}

const demoQuestionMeta: Record<string, DemoQuestionMeta> = {
  'qd-q1': {
    shortDescription: 'Noble gases — multiple selection',
    longDescription: 'Select exactly two noble gases from the offered choices.',
  },
  'qd-q2': {
    shortDescription: 'Phases of mitosis — ordering',
    longDescription: 'Put the phases of mitosis in order from first to last.',
  },
  'qd-q3': {
    shortDescription: 'European capitals — relating',
    longDescription: 'Match each country to its capital.',
  },
  'qd-q4': {
    shortDescription: 'Photosynthesis — completing',
    longDescription:
      'Complete the sentences about photosynthesis using the reusable word pool.',
  },
  'qd-q5': {
    shortDescription: 'Counting tones — short input',
    longDescription: 'How many tones do you hear? Enter a whole number.',
  },
  'qd-q6': {
    shortDescription: 'Describing motion — essay',
    longDescription: 'In 20–50 words, describe the motion shown in the video.',
  },
  'qd-q7': {
    shortDescription: 'Photosynthesis concept map — artifact',
    longDescription:
      'Produce one concept map showing the relationships among photosynthesis inputs, outputs, and energy flow.',
  },
  'qd-q8a': {
    shortDescription: 'Point marking over an image',
    longDescription: 'Place one point inside the circle.',
  },
  'qd-q8b': {
    shortDescription: 'TextSpan marking over a sentence',
    longDescription: 'Mark the verb phrase in the sentence.',
  },
  'qd-q9': {
    shortDescription: 'Select the circle — spatial selection',
    longDescription: 'Select the circle in the image.',
  },
  'qd-q10': {
    shortDescription: 'Heart diagram labels — completing',
    longDescription:
      'Complete the diagram by placing the four chamber labels in the correct positions.',
  },
  'qd-q11': {
    shortDescription: 'Chart value for 2020 — short input',
    longDescription: 'What value does the chart show for 2020?',
  },
  'qd-q12': {
    shortDescription: 'Mixed arithmetic — multi-interaction',
    longDescription:
      'Answer three activities: compute 2 + 3, select the even number, and explain your reasoning.',
  },
}

function toStoredQuestion(qd: QuestionDefinition): StoredQuestion {
  const meta = demoQuestionMeta[qd.id]
  return {
    id: qd.id,
    shortDescription: meta?.shortDescription ?? qd.shortDescription ?? qd.id,
    longDescription: meta?.longDescription ?? qd.longDescription ?? '',
    status: 'Active',
    categoryIds: [],
    stimuli: qd.stimuli,
    responseInteractions: qd.responseInteractions,
    interactionStimulusAssociations: qd.interactionStimulusAssociations,
    constraints: qd.constraints,
  }
}

/** The Q1–Q12 scenario questions from the frozen evaluation protocol, reused from
 * the domain fixtures (single source of truth). */
export const seedQuestions: StoredQuestion[] = [
  q1Qd,
  q2Qd,
  q3Qd,
  q4Qd,
  q5Qd,
  q6Qd,
  q7Qd,
  q8aQd,
  q8bQd,
  q9Qd,
  q10Qd,
  q11Qd,
  q12Qd,
].map(toStoredQuestion)

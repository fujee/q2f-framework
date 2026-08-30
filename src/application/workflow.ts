import type { QuestionDefinition } from '@/domain/qd/model'
import type {
  ElementPresentation,
  LayoutElement,
  OrderingMode,
  QuestionFormDefinition,
} from '@/domain/qfd/model'
import type { QuestionFormProfile } from '@/domain/qfd/profiles/model'
import { runEvaluationPipeline } from '@/domain/evaluation/pipeline'

export function createOrderingQuestion(input: {
  id: string
  instruction: string
  items: Array<{ id: string; semanticContent: string }>
  correctOrder: string[]
}): QuestionDefinition {
  return {
    id: input.id,
    responseInteractions: [
      {
        id: 'order',
        type: 'Ordering',
        instruction: input.instruction,
        itemOrderPolicy: 'Permutable',
        orderingItems: structuredClone(input.items),
        correctOrder: [...input.correctOrder],
      },
    ],
    stimuli: [],
    associations: [],
    constraints: [],
  }
}

/** Resolves the concrete choices exposed by the guided Ordering walkthrough. */
export function createOrderingQfd(
  qd: QuestionDefinition,
  profile: QuestionFormProfile,
  mode: OrderingMode
): QuestionFormDefinition {
  const interaction = qd.responseInteractions.find(
    (candidate) => candidate.type === 'Ordering'
  )
  if (!interaction || interaction.type !== 'Ordering')
    throw new Error('The guided QFD builder requires an Ordering interaction.')

  const presentations: ElementPresentation[] = interaction.orderingItems.map(
    ({ id }) => ({
      id: `order-${id}-presentation`,
      elementRef: {
        kind: 'OrderingItem',
        interactionRef: interaction.id,
        orderingItemRef: id,
      },
    })
  )
  const localLayout: LayoutElement = {
    kind: 'LayoutGroup',
    orientation: 'Vertical',
    children: presentations.map(({ id }) => ({
      kind: 'LayoutPlacement',
      realizationRef: { kind: 'ElementPresentation', id },
    })),
  }
  const taskInstruction = {
    id: 'order-task-instruction',
    role: 'TaskInstruction' as const,
  }
  return {
    questionDefinitionRef: qd.id,
    targetProfileRef: profile.id,
    stimulusRealizations: [],
    interactionRealizations: [
      {
        type: 'OrderingRealization',
        interactionRef: interaction.id,
        instructionRealizations: [taskInstruction],
        mode,
        presentation: {
          id: 'order-presentation',
          itemPresentations: presentations,
          localLayout,
        },
      },
    ],
    interactionPrecedences: [],
    dependencyRealizations: [],
    rootLayout: {
      kind: 'LayoutGroup',
      orientation: 'Vertical',
      children: [
        {
          kind: 'LayoutPlacement',
          realizationRef: {
            kind: 'InstructionRealization',
            id: taskInstruction.id,
          },
        },
        {
          kind: 'LayoutPlacement',
          realizationRef: {
            kind: 'OrderingPresentation',
            id: 'order-presentation',
          },
        },
      ],
    },
  }
}

export function evaluateStoredPair(
  caseId: string,
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  profile: QuestionFormProfile
) {
  return runEvaluationPipeline(caseId, qd, qfd, profile)
}

export const Q2_WALKTHROUGH = {
  id: 'reviewer-q2-ordering',
  instruction: 'Put the phases of mitosis in order from first to last.',
  items: [
    { id: 'metaphase', semanticContent: 'Metaphase' },
    { id: 'telophase', semanticContent: 'Telophase' },
    { id: 'prophase', semanticContent: 'Prophase' },
    { id: 'anaphase', semanticContent: 'Anaphase' },
  ],
  correctOrder: ['prophase', 'metaphase', 'anaphase', 'telophase'],
} as const

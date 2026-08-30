import {
  FROZEN_PRIMARY_CASES,
  type FrozenEvaluationCase,
} from '@/domain/evaluation/frozenProtocolFixtures'

export interface ReviewerExample {
  scenarioId: string
  summary: string
  cases: FrozenEvaluationCase[]
}

const SUMMARIES: Record<string, string> = {
  Q1: 'Same Selecting semantics, Expanded and Collapsed forms.',
  Q2: 'Same Ordering semantics, DirectOrdering and OrderNotation.',
  Q4: 'Text Workspace completion with concrete gap realizations.',
  Q5: 'Audio stimulus and target-profile feasibility contrast.',
  Q6: 'Shared Video context with logical Sequence.',
  Q7: 'Digital and physical artifact-submission contrast.',
  Q8A: 'Point marking tied to one concrete Workspace realization.',
  Q8B: 'TextSpan marking tied to one concrete Workspace realization.',
  Q9: 'Workspace adaptation that reaches REVIEW_REQUIRED.',
  Q10: 'Specification-based diagram materialization and review boundary.',
  Q11: 'Chart adaptation and deterministic review boundary.',
  Q12: 'Sequence and Dependency remain independent.',
}

export const REVIEWER_EXAMPLES: ReviewerExample[] = Object.entries(
  SUMMARIES
).map(([scenarioId, summary]) => ({
  scenarioId,
  summary,
  cases: FROZEN_PRIMARY_CASES.filter(({ id }) =>
    id.startsWith(`${scenarioId}-`)
  ),
}))

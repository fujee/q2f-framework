import type { QuestionDefinition } from '../../qd/model'
import {
  aggregateValidation,
  fail,
  type Finding,
  type ValidationResult,
} from '../../shared/findings'
import type { QuestionFormDefinition } from '../model'
import type { QuestionFormProfile } from '../profiles/model'
import { QfdValidationContext } from './context'
import { validateInteractionRealizations } from './rules/interactionRealizationRules'
import { validateLayout } from './rules/layoutRules'
import {
  validatePrecedenceAndDependencies,
  validateRootAndCoverage,
  validateStimulusRealizations,
} from './rules/rootRules'

/** Scientific QFD structural validation. Feasibility and conformance are separate. */
export function validateQFD(
  qfd: QuestionFormDefinition,
  qd: QuestionDefinition | undefined,
  profile: QuestionFormProfile | undefined
): ValidationResult {
  if (!qd || !profile) {
    const findings: Finding[] = [
      fail(
        'QFD-INPUT-001',
        'QFD validation requires the referenced QD and target profile.'
      ),
    ]
    return { findings, aggregate: aggregateValidation(findings) }
  }

  const context = new QfdValidationContext(qfd, qd, profile)
  const findings = [
    ...validateRootAndCoverage(qfd, context),
    ...validateStimulusRealizations(qfd, context),
    ...validateInteractionRealizations(qfd, context),
    ...validatePrecedenceAndDependencies(qfd, context),
    ...validateLayout(qfd),
  ]
  return { findings, aggregate: aggregateValidation(findings) }
}

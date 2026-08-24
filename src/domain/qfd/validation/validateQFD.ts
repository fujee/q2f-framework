import type { QuestionDefinition } from '../../qd/model'
import type { QuestionFormDefinition } from '../model'
import { validateRoot } from './rules/rootRules'
import { validateInteractionRealizations } from './rules/interactionRealizationRules'
import { validateStimulusRealizations } from './rules/stimulusRealizationRules'
import { validateLayout } from './rules/layoutRules'
import { validateBlocks } from './rules/blockRules'
import {
  aggregateValidation,
  type Finding,
  type ValidationResult,
  fail,
  pass,
} from '../../shared/findings'

const REFERENCE_RULE_IDS = new Set([
  'QFD-VAL-IR-001',
  'QFD-VAL-SR-001',
  'QFD-VAL-BLK-STM-001',
  'QFD-VAL-BLK-INT-001',
  'QFD-VAL-BLK-RES-001',
])

/** Runs the full QFD-FB-1.2 internal validation rule catalog. `qd` is the
 * QuestionDefinition referenced by `qfd.questionDefinitionRef`; pass `undefined`
 * only to exercise QFD-VAL-002 itself. */
export function validateQFD(
  qfd: QuestionFormDefinition,
  qd: QuestionDefinition | undefined
): ValidationResult {
  const findings: Finding[] = []

  findings.push(...validateRoot(qfd, qd))
  findings.push(
    ...validateInteractionRealizations(qfd.interactionRealizations, qd)
  )
  findings.push(...validateStimulusRealizations(qfd.stimulusRealizations, qd))
  findings.push(...validateLayout(qfd, qd))
  if (qfd.rootLayout) findings.push(...validateBlocks(qfd, qd))

  // QFD-VAL-005: all QFD references resolve — aggregated from the individual
  // reference-resolution checks above, reported once for full rule-catalog coverage.
  const anyReferenceFail = findings.some(
    (f) => REFERENCE_RULE_IDS.has(f.ruleId) && f.status === 'FAIL'
  )
  findings.push(
    anyReferenceFail
      ? fail('QFD-VAL-005', 'One or more QFD references do not resolve.')
      : pass('QFD-VAL-005', 'All QFD references resolve.')
  )

  return { findings, aggregate: aggregateValidation(findings) }
}

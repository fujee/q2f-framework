import type { QuestionDefinition } from '../model'
import { QdIndex } from './context'
import { validateAssociations } from './rules/associationRules'
import { validateCompleting } from './rules/completingRules'
import { validateConstraints } from './rules/constraintRules'
import { validateRoot } from './rules/rootRules'
import {
  validateOrdering,
  validateRelating,
  validateSelecting,
} from './rules/selectOrderRelateRules'
import {
  validateArtifactSubmission,
  validateEssay,
  validateMarking,
  validateShortInput,
} from './rules/shortInputEssayArtifactMarkingRules'
import { validateStimulus } from './rules/stimulusRules'
import {
  aggregateValidation,
  type Finding,
  type ValidationResult,
} from './types'

/** Validates internal consistency of the stabilized scientific QD model. */
export function validateQD(qd: QuestionDefinition): ValidationResult {
  const index = new QdIndex(qd)
  const findings: Finding[] = []

  findings.push(...validateRoot(qd, index))

  for (const interaction of qd.responseInteractions) {
    switch (interaction.type) {
      case 'Selecting':
        findings.push(...validateSelecting(interaction))
        break
      case 'Ordering':
        findings.push(...validateOrdering(interaction))
        break
      case 'Relating':
        findings.push(...validateRelating(interaction))
        break
      case 'Completing':
        findings.push(...validateCompleting(interaction))
        break
      case 'ShortInput':
        findings.push(...validateShortInput(interaction))
        break
      case 'Essay':
        findings.push(...validateEssay(interaction))
        break
      case 'ArtifactSubmission':
        findings.push(...validateArtifactSubmission(interaction))
        break
      case 'Marking':
        findings.push(...validateMarking(interaction, index))
        break
    }
  }

  for (const stimulus of qd.stimuli) {
    findings.push(...validateStimulus(stimulus))
  }

  findings.push(...validateAssociations(qd, index))
  findings.push(...validateConstraints(qd, index))

  return { findings, aggregate: aggregateValidation(findings) }
}

export { aggregateValidation } from './types'
export type {
  Finding,
  FindingStatus,
  ValidationAggregate,
  ValidationResult,
} from './types'

import type {
  ArtifactSubmission,
  Essay,
  Marking,
  ShortInput,
} from '../../model'
import type { QdIndex } from '../context'
import { type Finding, fail, pass } from '../types'
import { scalarErrors } from '../utils/scalar'

export function validateShortInput(interaction: ShortInput): Finding[] {
  const errors = scalarErrors(interaction)
  return [
    errors.length === 0
      ? pass(
          'SIN-001',
          'ShortInput scalar domain and correctness values are valid.'
        )
      : fail('SIN-001', `ShortInput is invalid: ${errors.join('; ')}.`, {
          path: `responseInteractions[${interaction.id}]`,
        }),
  ]
}

export function validateEssay(interaction: Essay): Finding[] {
  const path = `responseInteractions[${interaction.id}]`
  const hasBounds =
    interaction.minLength !== undefined || interaction.maxLength !== undefined
  const positive =
    (interaction.minLength === undefined ||
      (Number.isInteger(interaction.minLength) && interaction.minLength > 0)) &&
    (interaction.maxLength === undefined ||
      (Number.isInteger(interaction.maxLength) && interaction.maxLength > 0))
  const unitValid = hasBounds === (interaction.lengthUnit !== undefined)
  const coherent =
    interaction.minLength === undefined ||
    interaction.maxLength === undefined ||
    interaction.minLength <= interaction.maxLength
  return [
    positive && unitValid && coherent
      ? pass('ESS-001', 'Essay length configuration is valid.')
      : fail(
          'ESS-001',
          'Essay bounds must be positive and coherent, and lengthUnit exists iff a bound exists.',
          {
            path,
          }
        ),
  ]
}

export function validateArtifactSubmission(
  interaction: ArtifactSubmission
): Finding[] {
  const valid =
    Number.isInteger(interaction.minArtifacts) &&
    interaction.minArtifacts >= 1 &&
    (interaction.maxArtifacts === undefined ||
      (Number.isInteger(interaction.maxArtifacts) &&
        interaction.maxArtifacts >= interaction.minArtifacts)) &&
    interaction.artifactSpecification.trim().length > 0
  return [
    valid
      ? pass(
          'ART-001',
          'ArtifactSubmission bounds and specification are valid.'
        )
      : fail(
          'ART-001',
          'ArtifactSubmission requires positive coherent bounds and a non-empty specification.',
          {
            path: `responseInteractions[${interaction.id}]`,
          }
        ),
  ]
}

export function validateMarking(
  interaction: Marking,
  index: QdIndex
): Finding[] {
  const path = `responseInteractions[${interaction.id}]`
  const findings: Finding[] = []
  const boundsValid =
    Number.isInteger(interaction.minMarks) &&
    interaction.minMarks >= 1 &&
    (interaction.maxMarks === undefined ||
      (Number.isInteger(interaction.maxMarks) &&
        interaction.maxMarks >= interaction.minMarks))
  findings.push(
    boundsValid
      ? pass('MRK-001', 'Marking bounds are valid.')
      : fail(
          'MRK-001',
          'Marking requires minMarks >= 1 and maxMarks >= minMarks when present.',
          { path }
        )
  )
  const workspaces = index.workspaceAssociationsFor(interaction.id)
  findings.push(
    workspaces.length === 1
      ? pass('MRK-002', 'Marking has exactly one Workspace.')
      : fail(
          'MRK-002',
          'Marking must have exactly one Workspace association.',
          { path }
        )
  )
  if (workspaces.length === 1) {
    const stimulus = index.stimuliById.get(workspaces[0].stimulusRef)
    if (stimulus) {
      const required = interaction.markType === 'TextSpan' ? 'Text' : 'Image'
      findings.push(
        stimulus.allowedModalities.includes(required)
          ? pass('MRK-003', 'Marking Workspace permits a compatible modality.')
          : fail(
              'MRK-003',
              `${interaction.markType} requires at least one ${required}-compatible Workspace modality.`,
              {
                path,
              }
            )
      )
    }
  }
  return findings
}

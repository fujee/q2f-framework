import type {
  ArtifactSubmission,
  Essay,
  Marking,
  ShortInput,
} from '../../model'
import type { QdIndex } from '../context'
import { type Finding, fail, pass } from '../types'

// ---------------------------------------------------------------------------
// SIN — ShortInput
// ---------------------------------------------------------------------------

export function validateShortInput(interaction: ShortInput): Finding[] {
  const findings: Finding[] = []
  const path = `responseInteractions[${interaction.code}]`

  // SIN-001: at least one correct value
  if (interaction.correctValues.length >= 1) {
    findings.push(
      pass(
        'SIN-001',
        `ShortInput '${interaction.code}' declares ${interaction.correctValues.length} correct value(s).`
      )
    )
  } else {
    findings.push(
      fail(
        'SIN-001',
        `ShortInput '${interaction.code}' must declare at least one correct value.`,
        { path }
      )
    )
  }

  // SIN-002: every correct value matches inputType (Text is always valid; Number/Date
  // are already type-checked at the TypeScript level for this in-memory representation,
  // so this rule guards against values arriving from untyped/external sources).
  if (interaction.inputType === 'Number') {
    const allNumeric = interaction.correctValues.every((v) =>
      Number.isFinite(v)
    )
    findings.push(
      allNumeric
        ? pass(
            'SIN-002',
            `All correct values for ShortInput '${interaction.code}' are valid numbers.`
          )
        : fail(
            'SIN-002',
            `ShortInput '${interaction.code}' has correct value(s) that are not valid numbers.`,
            { path }
          )
    )
  } else if (interaction.inputType === 'Date') {
    const allValidDates = interaction.correctValues.every(
      (v) => !Number.isNaN(Date.parse(v))
    )
    findings.push(
      allValidDates
        ? pass(
            'SIN-002',
            `All correct values for ShortInput '${interaction.code}' are valid dates.`
          )
        : fail(
            'SIN-002',
            `ShortInput '${interaction.code}' has correct value(s) that are not valid ISO dates.`,
            { path }
          )
    )
  } else {
    findings.push(
      pass(
        'SIN-002',
        `ShortInput '${interaction.code}' is text-typed; all string correct values are valid.`
      )
    )
  }

  // SIN-003: min/max bounds internally consistent
  if (interaction.inputType === 'Text') {
    const consistent =
      interaction.minLength === undefined ||
      interaction.maxLength === undefined ||
      interaction.minLength <= interaction.maxLength
    findings.push(
      consistent
        ? pass(
            'SIN-003',
            `ShortInput '${interaction.code}' min/max length bounds are consistent.`
          )
        : fail(
            'SIN-003',
            `ShortInput '${interaction.code}' has minLength > maxLength.`,
            { path }
          )
    )
  } else {
    const consistent =
      interaction.minValue === undefined ||
      interaction.maxValue === undefined ||
      interaction.minValue <= interaction.maxValue
    findings.push(
      consistent
        ? pass(
            'SIN-003',
            `ShortInput '${interaction.code}' min/max value bounds are consistent.`
          )
        : fail(
            'SIN-003',
            `ShortInput '${interaction.code}' has minValue > maxValue.`,
            { path }
          )
    )
  }

  // SIN-004: correct values satisfy the declared bounds
  let inDomain: boolean
  if (interaction.inputType === 'Text') {
    inDomain = interaction.correctValues.every((v) => {
      const len = v.length
      return (
        (interaction.minLength === undefined || len >= interaction.minLength) &&
        (interaction.maxLength === undefined || len <= interaction.maxLength)
      )
    })
  } else {
    inDomain = interaction.correctValues.every(
      (v) =>
        (interaction.minValue === undefined || v >= interaction.minValue) &&
        (interaction.maxValue === undefined || v <= interaction.maxValue)
    )
  }
  findings.push(
    inDomain
      ? pass(
          'SIN-004',
          `Correct values for ShortInput '${interaction.code}' satisfy its own bounds.`
        )
      : fail(
          'SIN-004',
          `ShortInput '${interaction.code}' has correct value(s) outside its own declared bounds.`,
          { path }
        )
  )

  return findings
}

// ---------------------------------------------------------------------------
// ESS — Essay
// ---------------------------------------------------------------------------

export function validateEssay(interaction: Essay): Finding[] {
  const findings: Finding[] = []
  const path = `responseInteractions[${interaction.code}]`

  // ESS-001: length values, when present, are non-negative
  const nonNegative =
    (interaction.minLength === undefined || interaction.minLength >= 0) &&
    (interaction.maxLength === undefined || interaction.maxLength >= 0)
  findings.push(
    nonNegative
      ? pass(
          'ESS-001',
          `Essay '${interaction.code}' length values are non-negative.`
        )
      : fail(
          'ESS-001',
          `Essay '${interaction.code}' declares a negative length value.`,
          { path }
        )
  )

  // ESS-002: lengthUnit required whenever a length bound is present
  const hasBound =
    interaction.minLength !== undefined || interaction.maxLength !== undefined
  if (!hasBound || interaction.lengthUnit) {
    findings.push(
      pass(
        'ESS-002',
        `Essay '${interaction.code}' declares lengthUnit when a length bound is present.`
      )
    )
  } else {
    findings.push(
      fail(
        'ESS-002',
        `Essay '${interaction.code}' declares a length bound without a lengthUnit.`,
        { path }
      )
    )
  }

  // ESS-003: minLength <= maxLength
  const consistent =
    interaction.minLength === undefined ||
    interaction.maxLength === undefined ||
    interaction.minLength <= interaction.maxLength
  findings.push(
    consistent
      ? pass(
          'ESS-003',
          `Essay '${interaction.code}' min/max length bounds are consistent.`
        )
      : fail(
          'ESS-003',
          `Essay '${interaction.code}' has minLength > maxLength.`,
          { path }
        )
  )

  return findings
}

// ---------------------------------------------------------------------------
// ART — ArtifactSubmission
// ---------------------------------------------------------------------------

export function validateArtifactSubmission(
  interaction: ArtifactSubmission
): Finding[] {
  const findings: Finding[] = []
  const path = `responseInteractions[${interaction.code}]`

  // ART-001: minArtifacts >= 1
  findings.push(
    interaction.minArtifacts >= 1
      ? pass(
          'ART-001',
          `ArtifactSubmission '${interaction.code}' requires at least ${interaction.minArtifacts} artifact(s).`
        )
      : fail(
          'ART-001',
          `ArtifactSubmission '${interaction.code}' must require at least one artifact.`,
          { path }
        )
  )

  // ART-002: maxArtifacts >= minArtifacts when present
  findings.push(
    interaction.maxArtifacts === undefined ||
      interaction.maxArtifacts >= interaction.minArtifacts
      ? pass(
          'ART-002',
          `ArtifactSubmission '${interaction.code}' maxArtifacts bound is consistent.`
        )
      : fail(
          'ART-002',
          `ArtifactSubmission '${interaction.code}' has maxArtifacts < minArtifacts.`,
          { path }
        )
  )

  // ART-003: artifactSpecification present
  findings.push(
    interaction.artifactSpecification &&
      interaction.artifactSpecification.trim().length > 0
      ? pass(
          'ART-003',
          `ArtifactSubmission '${interaction.code}' declares an artifactSpecification.`
        )
      : fail(
          'ART-003',
          `ArtifactSubmission '${interaction.code}' must declare a non-empty artifactSpecification.`,
          { path }
        )
  )

  return findings
}

// ---------------------------------------------------------------------------
// MRK — Marking
// ---------------------------------------------------------------------------

export function validateMarking(
  interaction: Marking,
  index: QdIndex
): Finding[] {
  const findings: Finding[] = []
  const path = `responseInteractions[${interaction.code}]`

  // MRK-001: 1 <= minMarks <= maxMarks
  findings.push(
    interaction.minMarks >= 1 && interaction.minMarks <= interaction.maxMarks
      ? pass(
          'MRK-001',
          `Marking '${interaction.code}' mark-count bounds are valid.`
        )
      : fail(
          'MRK-001',
          `Marking '${interaction.code}' requires 1 <= minMarks <= maxMarks.`,
          { path }
        )
  )

  // MRK-002: exactly one Workspace association
  const workspaceAssociations = index.workspaceAssociationsFor(interaction.id)
  if (workspaceAssociations.length === 1) {
    findings.push(
      pass(
        'MRK-002',
        `Marking '${interaction.code}' has exactly one Workspace stimulus association.`
      )
    )
  } else {
    findings.push(
      fail(
        'MRK-002',
        `Marking '${interaction.code}' must have exactly one Workspace stimulus association; found ${workspaceAssociations.length}.`,
        { path }
      )
    )
  }

  // MRK-003 / MRK-004: Workspace stimulus modality must match markType
  if (workspaceAssociations.length === 1) {
    const stimulus = index.stimuliById.get(workspaceAssociations[0].stimulusRef)
    if (stimulus) {
      if (
        interaction.markType === 'Point' ||
        interaction.markType === 'Region'
      ) {
        findings.push(
          stimulus.type === 'Image'
            ? pass(
                'MRK-003',
                `Marking '${interaction.code}' (${interaction.markType}) is anchored to an ImageStimulus.`
              )
            : fail(
                'MRK-003',
                `Marking '${interaction.code}' (${interaction.markType}) requires an ImageStimulus Workspace, found '${stimulus.type}'.`,
                { path }
              )
        )
      }
      if (interaction.markType === 'TextSpan') {
        findings.push(
          stimulus.type === 'Text'
            ? pass(
                'MRK-004',
                `Marking '${interaction.code}' (TextSpan) is anchored to a TextStimulus.`
              )
            : fail(
                'MRK-004',
                `Marking '${interaction.code}' (TextSpan) requires a TextStimulus Workspace, found '${stimulus.type}'.`,
                { path }
              )
        )
      }
    }
  }

  return findings
}

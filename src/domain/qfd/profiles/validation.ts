import type { StimulusModality } from '../../qd/model'
import {
  aggregateValidation,
  fail,
  pass,
  type Finding,
  type ValidationResult,
} from '../../shared/findings'
import {
  QFD_CAPABILITIES,
  type QFDCapability,
  type QuestionFormProfile,
} from './model'

const MODALITIES: ReadonlySet<StimulusModality> = new Set([
  'Text',
  'Image',
  'Audio',
  'Video',
])

export function validateQuestionFormProfile(
  profile: QuestionFormProfile
): ValidationResult {
  const findings: Finding[] = []
  findings.push(
    profile.id.trim().length > 0
      ? pass('PROFILE-001', 'Profile id exists.')
      : fail('PROFILE-001', 'Profile id must be non-empty.', { path: 'id' })
  )
  findings.push(
    validSet(profile.supportedStimulusModalities, MODALITIES)
      ? pass('PROFILE-002', 'Stimulus modalities form a valid set.')
      : fail(
          'PROFILE-002',
          'supportedStimulusModalities must contain unique baseline values.',
          { path: 'supportedStimulusModalities' }
        )
  )
  findings.push(
    validSet(profile.capabilities, QFD_CAPABILITIES)
      ? pass('PROFILE-003', 'Capabilities form a valid set.')
      : fail(
          'PROFILE-003',
          'capabilities must contain unique baseline QFDCapability values.',
          { path: 'capabilities' }
        )
  )
  return { findings, aggregate: aggregateValidation(findings) }
}

function validSet<T extends string>(
  values: readonly T[],
  vocabulary: ReadonlySet<T>
): boolean {
  return (
    new Set(values).size === values.length &&
    values.every((value) => vocabulary.has(value))
  )
}

export function isQFDCapability(value: string): value is QFDCapability {
  return QFD_CAPABILITIES.has(value as QFDCapability)
}

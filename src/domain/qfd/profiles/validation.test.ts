import { describe, expect, it } from 'vitest'
import { INTERACTIVE_WEB_PROFILE_RECORD } from './registry'
import { validateQuestionFormProfile } from './validation'

describe('QuestionFormProfile validation', () => {
  it('accepts the normalized capability set', () => {
    expect(
      validateQuestionFormProfile(INTERACTIVE_WEB_PROFILE_RECORD.profile)
        .aggregate
    ).toBe('PASS')
  })

  it('rejects duplicate and unknown capability values', () => {
    const duplicate = structuredClone(INTERACTIVE_WEB_PROFILE_RECORD.profile)
    duplicate.capabilities.push(duplicate.capabilities[0])
    expect(validateQuestionFormProfile(duplicate).aggregate).toBe('FAIL')

    const unknown = structuredClone(INTERACTIVE_WEB_PROFILE_RECORD.profile)
    unknown.capabilities.push('GridLayout' as never)
    expect(validateQuestionFormProfile(unknown).aggregate).toBe('FAIL')
  })

  it('rejects duplicate and unknown modality values', () => {
    const duplicate = structuredClone(INTERACTIVE_WEB_PROFILE_RECORD.profile)
    duplicate.supportedStimulusModalities.push('Text')
    expect(validateQuestionFormProfile(duplicate).aggregate).toBe('FAIL')

    const unknown = structuredClone(INTERACTIVE_WEB_PROFILE_RECORD.profile)
    unknown.supportedStimulusModalities.push('Tactile' as never)
    expect(validateQuestionFormProfile(unknown).aggregate).toBe('FAIL')
  })

  it('keeps mediumFamily metadata outside capability generation', () => {
    const record = structuredClone(INTERACTIVE_WEB_PROFILE_RECORD)
    record.profile.capabilities = []
    record.metadata = { mediumFamily: 'InteractiveWeb' }
    expect(validateQuestionFormProfile(record.profile).aggregate).toBe('PASS')
    expect(record.profile.capabilities).toEqual([])
  })
})

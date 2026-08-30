import { describe, expect, it } from 'vitest'
import type { QuestionDefinition } from '../model'
import { referenceContentCarrier } from '../implementation/contentCarrier'
import {
  cloneQuestionDefinition,
  validAllInteractions,
} from '../fixtures/qdFixtures'
import { validateQD } from './validateQD'

function expectFailure(qd: QuestionDefinition, ruleId: string): void {
  const result = validateQD(qd)
  expect(result.aggregate).toBe('FAIL')
  expect(result.findings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ ruleId, status: 'FAIL' }),
    ])
  )
}

function useRegionAnchorForCompleting(qd: QuestionDefinition): void {
  const completing = qd.responseInteractions.find(
    ({ type }) => type === 'Completing'
  )
  if (!completing || completing.type !== 'Completing')
    throw new Error('fixture drift')
  completing.completingGaps[0].workspaceStimulusRef = 'stimulus-image'
  completing.completingGaps[0].sourceAnchor = {
    kind: 'RegionAnchor',
    payload: { implementationRegionId: 'answer-area' },
  }
  const textAssociation = qd.associations.find(
    ({ interactionRef, stimulusRef }) =>
      interactionRef === 'completing' && stimulusRef === 'stimulus-text'
  )
  if (!textAssociation) throw new Error('fixture drift')
  textAssociation.role = 'Context'
  qd.associations.push({
    interactionRef: 'completing',
    stimulusRef: 'stimulus-image',
    role: 'Workspace',
  })
}

describe('stabilized QD validation', () => {
  it('accepts a QD covering all eight ResponseInteraction types', () => {
    const result = validateQD(validAllInteractions)
    expect(
      new Set(validAllInteractions.responseInteractions.map(({ type }) => type))
    ).toEqual(
      new Set([
        'Selecting',
        'Ordering',
        'Relating',
        'Completing',
        'ShortInput',
        'Essay',
        'ArtifactSubmission',
        'Marking',
      ])
    )
    expect(result.aggregate).toBe('PASS')
  })

  it('rejects Selecting correctness outside global selection limits', () => {
    const qd = cloneQuestionDefinition()
    const selecting = qd.responseInteractions[0]
    if (selecting.type !== 'Selecting') throw new Error('fixture drift')
    selecting.choices[1].isCorrect = true
    expectFailure(qd, 'SEL-003')
  })

  it('enforces standaloneChoiceOrderPolicy cardinality', () => {
    const qd = cloneQuestionDefinition()
    const selecting = qd.responseInteractions[0]
    if (selecting.type !== 'Selecting') throw new Error('fixture drift')
    delete selecting.standaloneChoiceOrderPolicy
    expectFailure(qd, 'SEL-004')
  })

  it.each([
    ['missing', ['order-a']],
    ['duplicated', ['order-a', 'order-a']],
  ])(
    'rejects an Ordering correctOrder with an item %s',
    (_label, correctOrder) => {
      const qd = cloneQuestionDefinition()
      const ordering = qd.responseInteractions[1]
      if (ordering.type !== 'Ordering') throw new Error('fixture drift')
      ordering.correctOrder = correctOrder
      expectFailure(qd, 'ORD-002')
    }
  )

  it('rejects invalid Relating cardinality and required participation', () => {
    const qd = cloneQuestionDefinition()
    const relating = qd.responseInteractions[2]
    if (relating.type !== 'Relating') throw new Error('fixture drift')
    relating.sourceSet.relatingElements.push({
      id: 'source-de',
      semanticContent: 'Germany',
    })
    relating.targetSet.relatingElements.push({
      id: 'target-berlin',
      semanticContent: 'Berlin',
    })
    relating.correctRelations.push({
      sourceElementRef: 'source-fr',
      targetElementRef: 'target-berlin',
    })
    expectFailure(qd, 'REL-003')
    expectFailure(qd, 'REL-004')
  })

  it('allows the same RelatingElement id once in each set', () => {
    const qd = cloneQuestionDefinition()
    const relating = qd.responseInteractions[2]
    if (relating.type !== 'Relating') throw new Error('fixture drift')
    relating.targetSet.relatingElements[0].id = 'source-fr'
    relating.correctRelations[0].targetElementRef = 'source-fr'
    expect(validateQD(qd).aggregate).toBe('PASS')
  })

  it('accepts a TextAnchor supported by its concrete Content carrier', () => {
    expect(validateQD(cloneQuestionDefinition()).aggregate).toBe('PASS')
  })

  it('accepts a RegionAnchor supported by its concrete Content carrier', () => {
    const qd = cloneQuestionDefinition()
    useRegionAnchorForCompleting(qd)
    expect(validateQD(qd).aggregate).toBe('PASS')
  })

  it('treats SourceAnchor locator payloads as scientifically opaque', () => {
    const qd = cloneQuestionDefinition()
    const completing = qd.responseInteractions[3]
    if (completing.type !== 'Completing') throw new Error('fixture drift')
    completing.completingGaps[0].sourceAnchor = {
      kind: 'TextAnchor',
      payload: {
        rendererSpecificLocator: ['opaque', { anyShape: true }],
      },
    }
    expect(validateQD(qd).aggregate).toBe('PASS')
  })

  it('rejects a TextAnchor on a source without textual structure support', () => {
    const qd = cloneQuestionDefinition()
    const stimulus = qd.stimuli.find(({ id }) => id === 'stimulus-text')!
    stimulus.sourceContent = referenceContentCarrier('spatial source', {
      region: true,
    })
    expectFailure(qd, 'ASC-006')
  })

  it('rejects a RegionAnchor on a source without spatial structure support', () => {
    const qd = cloneQuestionDefinition()
    useRegionAnchorForCompleting(qd)
    const stimulus = qd.stimuli.find(({ id }) => id === 'stimulus-image')!
    stimulus.sourceContent = referenceContentCarrier('textual source', {
      text: true,
    })
    expectFailure(qd, 'ASC-006')
  })

  it('rejects a sourceAnchor when sourceContent is absent', () => {
    const qd = cloneQuestionDefinition()
    const stimulus = qd.stimuli.find(({ id }) => id === 'stimulus-text')!
    delete stimulus.sourceContent
    expectFailure(qd, 'ASC-006')
  })

  it('rejects a Completing gap without its declared Workspace association', () => {
    const qd = cloneQuestionDefinition()
    const completing = qd.responseInteractions[3]
    if (completing.type !== 'Completing') throw new Error('fixture drift')
    completing.completingGaps[0].workspaceStimulusRef = 'stimulus-image'
    expectFailure(qd, 'ASC-006')
  })

  it('rejects an infeasible shared item pool under global usageLimit', () => {
    const qd = cloneQuestionDefinition()
    const completing = qd.responseInteractions[3]
    if (completing.type !== 'Completing') throw new Error('fixture drift')
    completing.completingGaps.push({
      id: 'gap-city-2',
      type: 'ItemGap',
      workspaceStimulusRef: 'stimulus-text',
      sourceAnchor: {
        kind: 'TextAnchor',
        payload: { implementationLocator: '[city-2]' },
      },
      correctItemRefs: ['item-paris'],
    })
    expectFailure(qd, 'CMP-007')
  })

  it('enforces Text and non-Text caseSensitive rules', () => {
    const qd = cloneQuestionDefinition()
    const input = qd.responseInteractions[4]
    if (input.type !== 'ShortInput') throw new Error('fixture drift')
    input.caseSensitive = false
    expectFailure(qd, 'SIN-001')
    input.inputType = 'Text'
    delete input.caseSensitive
    input.correctValues = ['forty-two']
    delete input.minValue
    delete input.maxValue
    expectFailure(qd, 'SIN-001')
  })

  it('rejects an invalid Essay length configuration', () => {
    const qd = cloneQuestionDefinition()
    const essay = qd.responseInteractions[5]
    if (essay.type !== 'Essay') throw new Error('fixture drift')
    delete essay.lengthUnit
    essay.minLength = 200
    essay.maxLength = 100
    expectFailure(qd, 'ESS-001')
  })

  it('rejects invalid ArtifactSubmission bounds and specification', () => {
    const qd = cloneQuestionDefinition()
    const artifact = qd.responseInteractions[6]
    if (artifact.type !== 'ArtifactSubmission') throw new Error('fixture drift')
    artifact.minArtifacts = 0
    artifact.maxArtifacts = -1
    artifact.artifactSpecification = '  '
    expectFailure(qd, 'ART-001')
  })

  it('rejects an invalid Marking Workspace configuration', () => {
    const qd = cloneQuestionDefinition()
    qd.associations = qd.associations.filter(
      ({ interactionRef }) => interactionRef !== 'marking'
    )
    expectFailure(qd, 'MRK-002')
  })

  it('rejects an incompatible Marking Workspace modality', () => {
    const qd = cloneQuestionDefinition()
    const image = qd.stimuli.find(({ id }) => id === 'stimulus-image')!
    image.allowedModalities = ['Text']
    expectFailure(qd, 'MRK-003')
  })

  it('rejects invalid Stimulus materialization-policy inputs', () => {
    const qd = cloneQuestionDefinition()
    qd.stimuli[0].materializationPolicy = 'Adaptable'
    delete qd.stimuli[0].contentSpecification
    expectFailure(qd, 'STM-002')
  })

  it('rejects an orphan Stimulus', () => {
    const qd = cloneQuestionDefinition()
    qd.stimuli.push({
      id: 'orphan',
      sourceContent: 'unused',
      allowedModalities: ['Text'],
      materializationPolicy: 'Fixed',
    })
    expectFailure(qd, 'ASC-002')
  })

  it('rejects a duplicate interaction/stimulus pair even with another role', () => {
    const qd = cloneQuestionDefinition()
    qd.associations.push({
      interactionRef: 'completing',
      stimulusRef: 'stimulus-text',
      role: 'Context',
    })
    expectFailure(qd, 'ASC-001')
  })

  it('rejects invalid Sequence references and order structure', () => {
    const qd = cloneQuestionDefinition()
    qd.constraints.push({
      type: 'Sequence',
      interactionRefs: ['essay', 'essay', 'missing'],
    })
    expectFailure(qd, 'SEQ-001')
  })

  it('rejects a cycle formed by independent Sequence constraints', () => {
    const qd = cloneQuestionDefinition()
    qd.constraints.push({
      type: 'Sequence',
      interactionRefs: ['ordering', 'selecting'],
    })
    expectFailure(qd, 'SEQ-002')
  })

  it('rejects RequiresCorrectness with an Essay predecessor', () => {
    const qd = cloneQuestionDefinition()
    qd.constraints.push({
      type: 'Dependency',
      predecessorInteractionRef: 'essay',
      successorInteractionRef: 'artifact',
      rule: 'RequiresCorrectness',
      exposurePolicy: 'Unrestricted',
      strength: 'Preferred',
    })
    expectFailure(qd, 'DEP-002')
  })

  it('rejects a Required Dependency cycle independently from Sequence', () => {
    const qd = cloneQuestionDefinition()
    qd.constraints.push(
      {
        type: 'Dependency',
        predecessorInteractionRef: 'essay',
        successorInteractionRef: 'artifact',
        rule: 'RequiresCompletion',
        exposurePolicy: 'Unrestricted',
        strength: 'Required',
      },
      {
        type: 'Dependency',
        predecessorInteractionRef: 'artifact',
        successorInteractionRef: 'selecting',
        rule: 'RequiresCompletion',
        exposurePolicy: 'Unrestricted',
        strength: 'Required',
      }
    )
    expectFailure(qd, 'DEP-003')
  })
})

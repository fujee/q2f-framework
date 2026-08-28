import { describe, expect, it } from 'vitest'
import type { LayoutableRealizationRef, QuestionFormDefinition } from '../model'
import {
  buildValidQfd,
  cloneQfd,
  qfdTestProfile,
  qfdTestQd,
  validQfd,
} from '../fixtures/qfdFixtures'
import { validateQFD } from './validateQFD'

function validate(qfd: QuestionFormDefinition = validQfd) {
  return validateQFD(qfd, qfdTestQd, qfdTestProfile)
}

function expectFailure(qfd: QuestionFormDefinition, ruleId: string) {
  const result = validate(qfd)
  expect(result.aggregate).toBe('FAIL')
  expect(result.findings).toContainEqual(
    expect.objectContaining({ ruleId, status: 'FAIL' })
  )
}

function expectPass(qfd: QuestionFormDefinition) {
  expect(validate(qfd).aggregate).toBe('PASS')
}

function appendRootPlacement(
  qfd: QuestionFormDefinition,
  kind: Parameters<typeof placement>[0],
  id: string
) {
  if (qfd.rootLayout.kind !== 'LayoutGroup') throw new Error('fixture root')
  qfd.rootLayout.children.push(placement(kind, id))
}

function placement(kind: LayoutableRealizationRef['kind'], id: string) {
  return { kind: 'LayoutPlacement' as const, realizationRef: { kind, id } }
}

describe('QFD root, realization coverage, and instructions', () => {
  it('accepts a QFD containing all eight type-compatible realizations', () => {
    expect(validQfd.interactionRealizations).toHaveLength(8)
    expectPass(validQfd)
  })

  it('does not treat missing profile capabilities as QFD validation failures', () => {
    const profileWithoutCapabilities = {
      ...qfdTestProfile,
      capabilities: [],
      supportedStimulusModalities: [],
    }
    expect(
      validateQFD(validQfd, qfdTestQd, profileWithoutCapabilities).aggregate
    ).toBe('PASS')
  })

  it('rejects a missing, duplicate, or wrong-type realization', () => {
    const missing = cloneQfd()
    missing.interactionRealizations.pop()
    expectFailure(missing, 'QFD-IR-002')

    const duplicate = cloneQfd()
    duplicate.interactionRealizations.push(
      structuredClone(duplicate.interactionRealizations[0])
    )
    expectFailure(duplicate, 'QFD-IR-001')

    const wrongType = cloneQfd()
    wrongType.interactionRealizations[0] = {
      type: 'EssayRealization',
      interactionRef: 'selecting',
      instructionRealizations: [],
      responseSite: { id: 'wrong-site' },
    }
    expectFailure(wrongType, 'QFD-IR-002')
  })

  it('rejects multiple task instructions and empty operational guidance', () => {
    const tasks = cloneQfd()
    tasks.interactionRealizations[0].instructionRealizations.push({
      id: 'second-task',
      role: 'TaskInstruction',
    })
    expectFailure(tasks, 'QFD-INST-001')

    const guidance = cloneQfd()
    guidance.interactionRealizations[0].instructionRealizations[1].realizedText =
      '   '
    expectFailure(guidance, 'QFD-INST-001')
  })
})

describe('StimulusRealization structural validation', () => {
  it('accepts complete coverage and multiple SRs for one association', () => {
    expectPass(validQfd)
    const qfd = cloneQfd()
    qfd.stimulusRealizations.push({
      ...structuredClone(qfd.stimulusRealizations[0]),
      id: 'sr-select-second',
    })
    appendRootPlacement(qfd, 'StimulusRealization', 'sr-select-second')
    expectPass(qfd)
  })

  it('does not perform modality or materialization-policy conformance', () => {
    const qfd = cloneQfd()
    qfd.stimulusRealizations[0].realizedModality = 'Image'
    qfd.stimulusRealizations[0].mode = 'AdaptContent'
    qfd.stimulusRealizations[0].realizedContent = 'adapted technical content'
    expectPass(qfd)
  })

  it('rejects empty/duplicate served refs and an unassociated served pair', () => {
    const empty = cloneQfd()
    empty.stimulusRealizations[0].servedInteractionRefs = []
    expectFailure(empty, 'QFD-SR-002')

    const duplicate = cloneQfd()
    duplicate.stimulusRealizations[0].servedInteractionRefs = [
      'selecting',
      'selecting',
    ]
    expectFailure(duplicate, 'QFD-SR-002')

    const unassociated = cloneQfd()
    unassociated.stimulusRealizations[0].servedInteractionRefs = ['ordering']
    expectFailure(unassociated, 'QFD-SR-002')
  })

  it('rejects missing QD association coverage', () => {
    const qfd = cloneQfd()
    qfd.stimulusRealizations = qfd.stimulusRealizations.filter(
      ({ id }) => id !== 'sr-mark'
    )
    expectFailure(qfd, 'QFD-SR-003')
  })

  it('requires concrete content for AdaptContent and materialization', () => {
    for (const mode of [
      'AdaptContent',
      'MaterializeFromSpecification',
    ] as const) {
      const qfd = cloneQfd()
      qfd.stimulusRealizations[0].mode = mode
      expectFailure(qfd, 'QFD-SR-002')
    }
  })
})

describe('baseline outer and composite-local layout', () => {
  it('accepts nested horizontal/vertical layout', () => expectPass(validQfd))

  it('rejects empty groups and unresolved or duplicate placements', () => {
    const empty = cloneQfd()
    empty.rootLayout = {
      kind: 'LayoutGroup',
      orientation: 'Vertical',
      children: [],
    }
    expectFailure(empty, 'QFD-LAYOUT-001')

    const unresolved = cloneQfd()
    appendRootPlacement(unresolved, 'ResponseSiteRealization', 'not-owned')
    expectFailure(unresolved, 'QFD-LAYOUT-002')

    const duplicate = cloneQfd()
    appendRootPlacement(duplicate, 'ResponseSiteRealization', 'short-site')
    expectFailure(duplicate, 'QFD-LAYOUT-002')
  })

  it('rejects anchored plus independent placement and foreign local content', () => {
    const anchored = buildValidQfd({ itemResponsePlacement: 'Embedded' })
    appendRootPlacement(anchored, 'SelectionPresentation', 'item-selection')
    expectFailure(anchored, 'QFD-LAYOUT-002')

    const foreign = cloneQfd()
    const selecting = foreign.interactionRealizations.find(
      ({ type }) => type === 'SelectingRealization'
    )
    if (!selecting || selecting.type !== 'SelectingRealization')
      throw new Error()
    selecting.standaloneSelection!.localLayout = {
      kind: 'LayoutPlacement',
      realizationRef: { kind: 'ElementPresentation', id: 'order-a-p' },
    }
    expectFailure(foreign, 'QFD-LAYOUT-003')
  })
})

describe('Selecting, Ordering, and Relating structures', () => {
  it('accepts Expanded/Collapsed standalone and Direct/Referenced workspace modes', () => {
    expectPass(buildValidQfd({ workspaceSelection: 'DirectSelection' }))
    const referenced = buildValidQfd({
      workspaceSelection: 'ReferencedSelection',
    })
    const selecting = referenced.interactionRealizations[0]
    if (selecting.type !== 'SelectingRealization') throw new Error()
    selecting.standaloneSelection!.mode = 'Collapsed'
    expectPass(referenced)
  })

  it('rejects invalid workspace mode cardinality and wrong Choice ownership', () => {
    const direct = buildValidQfd()
    const directSelecting = direct.interactionRealizations[0]
    if (directSelecting.type !== 'SelectingRealization') throw new Error()
    directSelecting.workspaceRealizations[0].referencedResponseSite = {
      id: 'unexpected-site',
    }
    expectFailure(direct, 'QFD-TYPE-001')

    const referenced = buildValidQfd({
      workspaceSelection: 'ReferencedSelection',
    })
    const referencedSelecting = referenced.interactionRealizations[0]
    if (referencedSelecting.type !== 'SelectingRealization') throw new Error()
    delete referencedSelecting.workspaceRealizations[0].referencedResponseSite
    expectFailure(referenced, 'QFD-TYPE-001')

    const ownership = cloneQfd()
    const ownershipSelecting = ownership.interactionRealizations[0]
    if (ownershipSelecting.type !== 'SelectingRealization') throw new Error()
    ownershipSelecting.workspaceRealizations[0].choiceRealizations[0].choiceRef =
      'standalone-a'
    expectFailure(ownership, 'QFD-TYPE-001')
  })

  it('accepts both Ordering modes and rejects incomplete/duplicate items', () => {
    const notation = cloneQfd()
    const ordering = notation.interactionRealizations[1]
    if (ordering.type !== 'OrderingRealization') throw new Error()
    ordering.mode = 'OrderNotation'
    expectPass(notation)

    const missing = cloneQfd()
    const missingOrdering = missing.interactionRealizations[1]
    if (missingOrdering.type !== 'OrderingRealization') throw new Error()
    missingOrdering.presentation.itemPresentations.pop()
    expectFailure(missing, 'QFD-TYPE-001')

    const duplicate = cloneQfd()
    const duplicateOrdering = duplicate.interactionRealizations[1]
    if (duplicateOrdering.type !== 'OrderingRealization') throw new Error()
    duplicateOrdering.presentation.itemPresentations[1].elementRef =
      structuredClone(
        duplicateOrdering.presentation.itemPresentations[0].elementRef
      )
    expectFailure(duplicate, 'QFD-TYPE-001')
  })

  it('accepts both Relating modes and same raw id in source and target', () => {
    expectPass(validQfd)
    const notation = cloneQfd()
    const relating = notation.interactionRealizations[2]
    if (relating.type !== 'RelatingRealization') throw new Error()
    relating.mode = 'RelationNotation'
    relating.notationResponseSite = { id: 'relation-notation-site' }
    appendRootPlacement(
      notation,
      'ResponseSiteRealization',
      'relation-notation-site'
    )
    expectPass(notation)
  })

  it('rejects wrong source/target presentation membership', () => {
    const qfd = cloneQfd()
    const relating = qfd.interactionRealizations[2]
    if (relating.type !== 'RelatingRealization') throw new Error()
    const ref =
      relating.sourceSetPresentation.elementPresentations[0].elementRef
    if (ref.kind !== 'RelatingElement') throw new Error()
    ref.set = 'Target'
    expectFailure(qfd, 'QFD-TYPE-001')
  })
})

describe('Completing structures', () => {
  it.each([
    ['ItemSelection', 'Embedded'],
    ['ItemSelection', 'Referenced'],
    ['DirectPlacement', 'Embedded'],
    ['DirectPlacement', 'Referenced'],
  ] as const)(
    'accepts %s with %s placement',
    (itemAssignment, itemResponsePlacement) => {
      expectPass(buildValidQfd({ itemAssignment, itemResponsePlacement }))
    }
  )

  it('rejects incorrect conditional presentations/sites', () => {
    const qfd = buildValidQfd({
      itemAssignment: 'DirectPlacement',
      itemResponsePlacement: 'Referenced',
    })
    const completing = qfd.interactionRealizations[3]
    if (completing.type !== 'CompletingRealization') throw new Error()
    const itemGap = completing.gapRealizations[1]
    if (itemGap.type !== 'ItemGapRealization') throw new Error()
    delete itemGap.referencedPlacementSite
    expectFailure(qfd, 'QFD-TYPE-001')

    const selection = buildValidQfd({ itemAssignment: 'ItemSelection' })
    const selectionCompleting = selection.interactionRealizations[3]
    if (selectionCompleting.type !== 'CompletingRealization') throw new Error()
    const selectionGap = selectionCompleting.gapRealizations[1]
    if (selectionGap.type !== 'ItemGapRealization') throw new Error()
    selectionGap.referencedPlacementSite = { id: 'unexpected-placement-site' }
    expectFailure(selection, 'QFD-TYPE-001')
  })

  it('enforces itemSource iff DirectPlacement and exact shared item coverage', () => {
    const missingSource = buildValidQfd({ itemAssignment: 'DirectPlacement' })
    const completing = missingSource.interactionRealizations[3]
    if (completing.type !== 'CompletingRealization') throw new Error()
    delete completing.itemSource
    expectFailure(missingSource, 'QFD-TYPE-001')

    const extraSource = cloneQfd()
    const extraCompleting = extraSource.interactionRealizations[3]
    if (extraCompleting.type !== 'CompletingRealization') throw new Error()
    extraCompleting.itemSource = {
      id: 'unexpected-source',
      itemPresentations: [],
      localLayout: {
        kind: 'LayoutGroup',
        orientation: 'Horizontal',
        children: [],
      },
    }
    expectFailure(extraSource, 'QFD-TYPE-001')

    const incomplete = buildValidQfd({ itemAssignment: 'DirectPlacement' })
    const incompleteCompleting = incomplete.interactionRealizations[3]
    if (incompleteCompleting.type !== 'CompletingRealization') throw new Error()
    incompleteCompleting.itemSource!.itemPresentations.pop()
    expectFailure(incomplete, 'QFD-TYPE-001')
  })
})

describe('remaining realization types, precedence, and dependencies', () => {
  it('accepts ShortInput, Essay, ArtifactSubmission, and Marking structures', () => {
    expectPass(validQfd)
  })

  it('rejects invalid required response/submission/workspace sites', () => {
    for (const index of [4, 5, 6] as const) {
      const qfd = cloneQfd()
      const realization = qfd.interactionRealizations[index]
      if (realization.type === 'ShortInputRealization')
        realization.responseSite.id = ''
      else if (realization.type === 'EssayRealization')
        realization.responseSite.id = ''
      else if (realization.type === 'ArtifactSubmissionRealization')
        realization.submissionSite.id = ''
      expectFailure(qfd, 'QFD-TYPE-001')
    }
    const marking = cloneQfd()
    const markingRealization = marking.interactionRealizations[7]
    if (markingRealization.type !== 'MarkingRealization') throw new Error()
    markingRealization.workspaceRealizationRef = 'sr-select'
    expectFailure(marking, 'QFD-TYPE-001')
  })

  it('accepts acyclic precedence and rejects self, duplicate, and cyclic edges', () => {
    expectPass(validQfd)
    const self = cloneQfd()
    self.interactionPrecedences = [
      { beforeInteractionRef: 'selecting', afterInteractionRef: 'selecting' },
    ]
    expectFailure(self, 'QFD-PREC-001')

    const duplicate = cloneQfd()
    duplicate.interactionPrecedences.push(
      structuredClone(duplicate.interactionPrecedences[0])
    )
    expectFailure(duplicate, 'QFD-PREC-001')

    const cycle = cloneQfd()
    cycle.interactionPrecedences.push({
      beforeInteractionRef: 'ordering',
      afterInteractionRef: 'selecting',
    })
    expectFailure(cycle, 'QFD-PREC-001')
  })

  it('accepts structural dependencies without QD matching and rejects self/duplicates', () => {
    expectPass(validQfd)
    const extra = cloneQfd()
    extra.dependencyRealizations.push({
      predecessorInteractionRef: 'short',
      successorInteractionRef: 'artifact',
      rule: 'RequiresCompletion',
      exposurePolicy: 'Unrestricted',
    })
    expectPass(extra)

    const self = cloneQfd()
    self.dependencyRealizations[0].successorInteractionRef = 'selecting'
    expectFailure(self, 'QFD-DEP-001')

    const duplicate = cloneQfd()
    duplicate.dependencyRealizations.push(
      structuredClone(duplicate.dependencyRealizations[0])
    )
    expectFailure(duplicate, 'QFD-DEP-001')
  })
})

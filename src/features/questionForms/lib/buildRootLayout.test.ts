import { describe, expect, it, beforeEach } from 'vitest'
import { useQuestionFormEditorStore } from '../store/questionFormEditorStore'
import { generateSuggestedRootLayout } from './buildRootLayout'
import { assembleQfd } from './assembleQfd'
import { evaluateConformance } from '@/domain/qfd/conformance/evaluateConformance'
import { INTERACTIVE_WEB_PROFILE } from '@/domain/qfd/profiles/registry'
import * as fx from '@/domain/qfd/fixtures/qfdFixtures'

describe('suggested layout honors mechanism layout requirements', () => {
  beforeEach(() => {
    useQuestionFormEditorStore.getState().reset()
  })

  it('hosts SpatialSelection in a Canvas with each Choice placed', () => {
    const qd = fx.q1Qd
    const store = useQuestionFormEditorStore.getState()
    store.initForQuestion(qd)
    store.setMechanism('q1-select', 'SpatialSelection')

    const layout = generateSuggestedRootLayout(
      qd,
      useQuestionFormEditorStore.getState().draft
    )
    expect(layout.kind).toBe('Stack')
    if (layout.kind !== 'Stack') return
    const canvas = layout.children[0]
    expect(canvas.kind).toBe('Canvas')
    if (canvas.kind !== 'Canvas') return

    const choiceBlocks = canvas.items.filter(
      (i) => i.child.kind === 'ResponseElementBlock'
    )
    const interactionBlocks = canvas.items.filter(
      (i) => i.child.kind === 'InteractionBlock'
    )
    expect(choiceBlocks).toHaveLength(4)
    expect(interactionBlocks).toHaveLength(1)
    // Each Choice gets a distinct spatial position.
    expect(new Set(choiceBlocks.map((i) => i.area.x)).size).toBe(4)
  })

  it('produces a layout that passes CONF-PRES-001 for SpatialSelection', () => {
    const qd = fx.q1Qd
    const store = useQuestionFormEditorStore.getState()
    store.initForQuestion(qd)
    store.setMechanism('q1-select', 'SpatialSelection')
    const draft = useQuestionFormEditorStore.getState().draft
    const layout = generateSuggestedRootLayout(qd, draft)

    const body = assembleQfd(qd, { ...draft, rootLayout: layout })
    const qfd = { id: 'qfd-q1-spatial', ...body }
    const result = evaluateConformance(qd, qfd, INTERACTIVE_WEB_PROFILE)
    expect(
      result.findings.find((f) => f.ruleId === 'CONF-PRES-001')?.status
    ).toBe('PASS')
  })

  it('suggests an Inline workspace for DirectMarking over text (Q8B)', () => {
    const qd = fx.q8bQd
    const store = useQuestionFormEditorStore.getState()
    store.initForQuestion(qd)
    store.setMechanism('q8b-mark', 'DirectMarking')
    const draft = useQuestionFormEditorStore.getState().draft
    const layout = generateSuggestedRootLayout(qd, draft)

    expect(layout.kind).toBe('Stack')
    if (layout.kind !== 'Stack') return
    expect(layout.children[0].kind).toBe('Inline')

    const body = assembleQfd(qd, { ...draft, rootLayout: layout })
    const qfd = { id: 'qfd-q8b-suggested', ...body }
    const result = evaluateConformance(qd, qfd, INTERACTIVE_WEB_PROFILE)
    expect(
      result.findings.find((f) => f.ruleId === 'CONF-PRES-001')?.status
    ).toBe('PASS')
  })

  it('suggests a Canvas workspace for DirectMarking over an image (Q8A)', () => {
    const qd = fx.q8aQd
    const store = useQuestionFormEditorStore.getState()
    store.initForQuestion(qd)
    store.setMechanism('q8a-mark', 'DirectMarking')
    const draft = useQuestionFormEditorStore.getState().draft
    const layout = generateSuggestedRootLayout(qd, draft)

    expect(layout.kind).toBe('Stack')
    if (layout.kind !== 'Stack') return
    expect(layout.children[0].kind).toBe('Canvas')

    const body = assembleQfd(qd, { ...draft, rootLayout: layout })
    const qfd = { id: 'qfd-q8a-suggested', ...body }
    const result = evaluateConformance(qd, qfd, INTERACTIVE_WEB_PROFILE)
    expect(
      result.findings.find((f) => f.ruleId === 'CONF-PRES-001')?.status
    ).toBe('PASS')
  })

  it('places the Interaction block behind its stimulus and response elements', () => {
    const qd = fx.q9Qd
    const store = useQuestionFormEditorStore.getState()
    store.initForQuestion(qd)
    store.setMechanism('q9-spatial-select', 'SpatialSelection')
    const draft = useQuestionFormEditorStore.getState().draft
    const layout = generateSuggestedRootLayout(qd, draft)

    expect(layout.kind).toBe('Stack')
    if (layout.kind !== 'Stack') return
    const canvas = layout.children[0]
    expect(canvas.kind).toBe('Canvas')
    if (canvas.kind !== 'Canvas') return

    const interaction = canvas.items.find(
      (i) => i.child.kind === 'InteractionBlock'
    )
    const stimulus = canvas.items.find((i) => i.child.kind === 'StimulusBlock')
    const elements = canvas.items.filter(
      (i) => i.child.kind === 'ResponseElementBlock'
    )
    expect(interaction).toBeDefined()
    expect(stimulus).toBeDefined()
    expect(elements.length).toBeGreaterThan(0)

    // The interaction is a hosting layer: strictly behind everything it hosts.
    expect(interaction!.layer).toBeLessThan(stimulus!.layer)
    for (const el of elements) {
      expect(interaction!.layer).toBeLessThan(el.layer)
    }
  })

  it('keeps suggested response elements below the reserved instruction area', () => {
    const qd = fx.q9Qd
    const store = useQuestionFormEditorStore.getState()
    store.initForQuestion(qd)
    store.setMechanism('q9-spatial-select', 'SpatialSelection')
    const draft = useQuestionFormEditorStore.getState().draft
    const layout = generateSuggestedRootLayout(qd, draft)

    expect(layout.kind).toBe('Stack')
    if (layout.kind !== 'Stack') return
    const canvas = layout.children[0]
    expect(canvas.kind).toBe('Canvas')
    if (canvas.kind !== 'Canvas') return

    const elements = canvas.items.filter(
      (i) => i.child.kind === 'ResponseElementBlock'
    )
    expect(elements.length).toBeGreaterThan(0)
    // The top ~15% of the Canvas is reserved for the instruction text.
    for (const el of elements) {
      expect(el.area.y).toBeGreaterThanOrEqual(0.15)
    }
  })
})

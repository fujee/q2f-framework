import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateQD } from '@/domain/qd/validation/validateQD'
import {
  CONVENTIONAL_PAPER_PROFILE,
  INTERACTIVE_WEB_PROFILE,
} from '@/domain/qfd/profiles/registry'
import { observedOutcome } from '@/domain/evaluation/pipeline'
import { QfdPreview } from '@/features/questionForms/renderer/RenderPreview'
import { MemoryStringStore, WorkbenchRepository } from './repository'
import {
  createOrderingQfd,
  createOrderingQuestion,
  evaluateStoredPair,
  Q2_WALKTHROUGH,
} from './workflow'

function recordTimes() {
  return {
    createdAt: '2026-08-30T12:00:00.000Z',
    updatedAt: '2026-08-30T12:00:00.000Z',
  }
}

describe('reviewer application workflow', () => {
  it('round-trips a complete QD without adding metadata to the scientific model', () => {
    const repository = new WorkbenchRepository(new MemoryStringStore())
    const qd = createOrderingQuestion({
      ...Q2_WALKTHROUGH,
      items: [...Q2_WALKTHROUGH.items],
      correctOrder: [...Q2_WALKTHROUGH.correctOrder],
    })
    repository.saveQuestion({
      recordId: 'question-q2',
      authoringLabel: 'Application-only label',
      qd,
      ...recordTimes(),
    })
    const loaded = repository.load().questions[0]
    expect(loaded.qd).toEqual(qd)
    expect(validateQD(loaded.qd).aggregate).toBe('PASS')
    expect(loaded.qd).not.toHaveProperty('authoringLabel')
    expect(loaded.qd.responseInteractions[0]).toMatchObject({
      type: 'Ordering',
      correctOrder: ['prophase', 'metaphase', 'anaphase', 'telophase'],
    })
  })

  it('stores multiple scientific QFDs for one QD and preserves profile references', () => {
    const repository = new WorkbenchRepository(new MemoryStringStore())
    const qd = createOrderingQuestion({
      ...Q2_WALKTHROUGH,
      items: [...Q2_WALKTHROUGH.items],
      correctOrder: [...Q2_WALKTHROUGH.correctOrder],
    })
    const web = createOrderingQfd(qd, INTERACTIVE_WEB_PROFILE, 'DirectOrdering')
    const paper = createOrderingQfd(
      qd,
      CONVENTIONAL_PAPER_PROFILE,
      'OrderNotation'
    )
    for (const [recordId, qfd] of [
      ['qfd-web', web],
      ['qfd-paper', paper],
    ] as const)
      repository.saveQuestionForm({
        recordId,
        authoringLabel: recordId,
        questionRecordId: 'question-q2',
        qfd,
        ...recordTimes(),
      })
    const loaded = repository.load().questionForms
    expect(loaded).toHaveLength(2)
    expect(loaded.map(({ qfd }) => qfd)).toEqual([web, paper])
    expect(loaded.map(({ qfd }) => qfd.targetProfileRef)).toEqual([
      'InteractiveWebProfile',
      'ConventionalPaperProfile',
    ])
    expect(loaded.every(({ qfd }) => !('id' in qfd))).toBe(true)
  })

  it('connects stored models to the stabilized pipeline and reviewed preview', () => {
    const qd = createOrderingQuestion({
      ...Q2_WALKTHROUGH,
      items: [...Q2_WALKTHROUGH.items],
      correctOrder: [...Q2_WALKTHROUGH.correctOrder],
    })
    const qfd = createOrderingQfd(qd, INTERACTIVE_WEB_PROFILE, 'DirectOrdering')
    const evaluation = evaluateStoredPair(
      'reviewer-workflow',
      qd,
      qfd,
      INTERACTIVE_WEB_PROFILE
    )
    expect(observedOutcome(evaluation)).toEqual({
      qdValidation: 'PASS',
      qfdValidation: 'PASS',
      feasibility: 'FEASIBLE',
      conformance: 'CONFORMANT',
    })
    const html = renderToStaticMarkup(<QfdPreview qd={qd} qfd={qfd} />)
    expect(html).toContain('data-ordering-mode="DirectOrdering"')
    expect(html).toContain('Metaphase')
  })
})

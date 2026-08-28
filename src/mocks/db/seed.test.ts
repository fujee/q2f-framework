import { describe, expect, it } from 'vitest'
import { seedQuestions } from './seed'
import { seedQuestionFormDefinitions } from './qfdSeed'
import { validateQD } from '@/domain/qd/validation/validateQD'
import { validateQFD } from '@/domain/qfd/validation/validateQFD'
import type { QuestionDefinition } from '@/domain/qd/model'

/** Mirrors the API round-trip: `StoredQuestion.categoryIds` becomes the domain
 * `QuestionDefinition.categories`. */
function toQuestionDefinition(
  q: (typeof seedQuestions)[number]
): QuestionDefinition {
  return {
    id: q.id,
    shortDescription: q.shortDescription,
    longDescription: q.longDescription,
    status: q.status,
    categories: q.categoryIds,
    stimuli: q.stimuli,
    responseInteractions: q.responseInteractions,
    interactionStimulusAssociations: q.interactionStimulusAssociations,
    constraints: q.constraints,
  }
}

describe('seed data (Q1–Q12 demo questions)', () => {
  it('seeds the Q1–Q12 scenario questions with unique ids', () => {
    expect(seedQuestions).toHaveLength(13)
    const ids = new Set(seedQuestions.map((q) => q.id))
    expect(ids.size).toBe(13)
  })

  it('every seeded question passes QD validation', () => {
    for (const q of seedQuestions) {
      const result = validateQD(toQuestionDefinition(q))
      expect(
        result.aggregate,
        `${q.id}: ${result.findings
          .filter((f) => f.status === 'FAIL')
          .map((f) => f.ruleId)
          .join(',')}`
      ).toBe('PASS')
    }
  })

  it('every seeded form definition is valid and references a seeded question', () => {
    expect(seedQuestionFormDefinitions).toHaveLength(26)
    const formIds = new Set(seedQuestionFormDefinitions.map((f) => f.id))
    expect(formIds.size).toBe(26)

    const qdById = new Map(
      seedQuestions.map((q) => [q.id, toQuestionDefinition(q)])
    )
    for (const form of seedQuestionFormDefinitions) {
      const qd = qdById.get(form.questionDefinitionRef)
      expect(qd, `missing QD for ${form.id}`).toBeDefined()
      const result = validateQFD(form, qd!)
      expect(
        result.aggregate,
        `${form.id}: ${result.findings
          .filter((f) => f.status === 'FAIL')
          .map((f) => f.ruleId)
          .join(',')}`
      ).toBe('PASS')
    }
  })

  it('every seeded question has both web and paper form definitions', () => {
    for (const q of seedQuestions) {
      const forms = seedQuestionFormDefinitions.filter(
        (f) => f.questionDefinitionRef === q.id
      )
      expect(forms, q.id).toHaveLength(2)
      expect(new Set(forms.map((f) => f.targetProfileRef))).toEqual(
        new Set(['InteractiveWebProfile', 'ConventionalPaperProfile'])
      )
    }
  })

  it('every seeded interaction carries the question text (instruction)', () => {
    for (const q of seedQuestions) {
      for (const ia of q.responseInteractions) {
        expect(ia.instruction, `${q.id}/${ia.id}`).toBeTruthy()
      }
    }
  })

  it('places Q10 drop targets on the four heart chambers', () => {
    const form = seedQuestionFormDefinitions.find((f) => f.id === 'qfd-q10-web')
    expect(form).toBeDefined()
    const layout = form!.rootLayout
    expect(layout.kind).toBe('Canvas')
    if (layout.kind !== 'Canvas') return

    const gaps = layout.items
      .filter(
        (i) =>
          i.child.kind === 'ResponseElementBlock' &&
          i.child.elementKind === 'CompletingGap'
      )
      .map((i) => ({
        id: (i.child as { elementRef: string }).elementRef,
        area: i.area,
      }))
    expect(gaps).toHaveLength(4)
    const byId = new Map(gaps.map((g) => [g.id, g.area]))

    const la = byId.get('gap-la')!
    const ra = byId.get('gap-ra')!
    const lv = byId.get('gap-lv')!
    const rv = byId.get('gap-rv')!

    // Left chambers sit on the left half, right chambers on the right half.
    expect(la.x + la.width).toBeLessThan(0.5)
    expect(lv.x + lv.width).toBeLessThan(0.5)
    expect(ra.x).toBeGreaterThan(0.5)
    expect(rv.x).toBeGreaterThan(0.5)
    // Atria sit above the ventricles.
    expect(la.y + la.height).toBeLessThan(lv.y)
    expect(ra.y + ra.height).toBeLessThan(rv.y)
  })
})

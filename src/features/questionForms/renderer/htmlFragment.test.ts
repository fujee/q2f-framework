import { describe, expect, it } from 'vitest'
import {
  FROZEN_BOUNDARY_CASES,
  FROZEN_PRIMARY_CASES,
} from '@/domain/evaluation/frozenProtocolFixtures'
import {
  buildHtmlFragment,
  StaticDependencyUnsupportedError,
} from './htmlFragment'

function primary(id: string) {
  const value = FROZEN_PRIMARY_CASES.find((candidate) => candidate.id === id)
  if (!value) throw new Error(`Missing frozen case ${id}`)
  return value
}

describe('static HTML on the stabilized QFD model', () => {
  it('renders recursive Horizontal and Vertical layout groups without deriving precedence', () => {
    const { qd, qfd } = primary('Q1-ConventionalPaperProfile')
    const html = buildHtmlFragment(qd, {
      ...qfd,
      rootLayout: {
        kind: 'LayoutGroup',
        orientation: 'Horizontal',
        children: [
          {
            kind: 'LayoutGroup',
            orientation: 'Vertical',
            children:
              qfd.rootLayout.kind === 'LayoutGroup'
                ? qfd.rootLayout.children
                : [],
          },
        ],
      },
    })
    expect(html).toContain('data-orientation="Horizontal"')
    expect(html).toContain('data-orientation="Vertical"')
    expect(html).not.toContain('dependency')
  })

  it('renders TaskInstruction from QD but does not invent missing OperationalGuidance text', () => {
    const { qd, qfd } = primary('Q1-ConventionalPaperProfile')
    const realization = qfd.interactionRealizations[0]
    const guidance = { id: 'guidance', role: 'OperationalGuidance' as const }
    const changedRealization = {
      ...realization,
      instructionRealizations: [
        ...realization.instructionRealizations,
        guidance,
      ],
    }
    const html = buildHtmlFragment(qd, {
      ...qfd,
      interactionRealizations: [changedRealization],
      rootLayout: {
        kind: 'LayoutGroup',
        orientation: 'Vertical',
        children: [
          ...(qfd.rootLayout.kind === 'LayoutGroup'
            ? qfd.rootLayout.children
            : []),
          {
            kind: 'LayoutPlacement',
            realizationRef: { kind: 'InstructionRealization', id: guidance.id },
          },
        ],
      },
    })
    expect(html).toContain(qd.responseInteractions[0].instruction ?? '')
    expect(html).not.toContain('data-instruction-role="OperationalGuidance"')
  })

  it.each([
    ['Q1-ConventionalPaperProfile', 'SelectingRealization'],
    ['Q2-ConventionalPaperProfile', 'OrderingRealization'],
    ['Q3-ConventionalPaperProfile', 'RelatingRealization'],
    ['Q4-ConventionalPaperProfile', 'CompletingRealization'],
    ['Q5-ConventionalPaperProfile', 'ShortInputRealization'],
    ['Q6-ConventionalPaperProfile', 'EssayRealization'],
    ['Q7-ConventionalPaperProfile', 'ArtifactSubmissionRealization'],
    ['Q8A-ConventionalPaperProfile', 'MarkingRealization'],
  ])('renders %s through its typed %s family', (caseId, realizationType) => {
    const { qd, qfd } = primary(caseId)
    expect(
      qfd.interactionRealizations.some(({ type }) => type === realizationType)
    ).toBe(true)
    const html = buildHtmlFragment(qd, qfd)
    expect(html).toContain('qfd-')
    expect(html).not.toContain('Missing ')
  })

  it('renders a concrete Marking workspace affordance without defining universal mark geometry', () => {
    const { qd, qfd } = primary('Q8A-ConventionalPaperProfile')
    const html = buildHtmlFragment(qd, qfd)
    expect(html).toContain('data-affordance-kind="Marking"')
    expect(html).toContain('data-sr-id=')
    expect(html).not.toContain('DirectMarking')
  })

  it('fails explicitly when static export cannot execute dynamic dependency behavior', () => {
    const frozen = FROZEN_BOUNDARY_CASES.find(({ id }) => id === 'B12-P')
    if (!frozen) throw new Error('Missing B12-P')
    expect(() => buildHtmlFragment(frozen.qd, frozen.qfd)).toThrow(
      StaticDependencyUnsupportedError
    )
  })
})

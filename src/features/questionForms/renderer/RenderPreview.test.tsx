import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FROZEN_BOUNDARY_CASES } from '@/domain/evaluation/frozenProtocolFixtures'
import { QfdPreview } from './RenderPreview'

describe('interactive B12 concealment boundary', () => {
  it('keeps shared Stimulus content visible without leaking successor-specific units', () => {
    const frozen = FROZEN_BOUNDARY_CASES.find(({ id }) => id === 'B12-P')
    if (!frozen) throw new Error('Missing B12-P')
    const html = renderToStaticMarkup(
      <QfdPreview qd={frozen.qd} qfd={frozen.qfd} />
    )
    expect(html).toContain('Shared context remains visible for interaction A.')
    expect(html).toContain('Answer interaction A using the shared context.')
    expect(html).toContain('A1')
    expect(html).not.toContain('Answer interaction B using the shared context.')
    expect(html).not.toContain('B1')
    expect(html).not.toContain('data-interaction-ref="b"')
  })
})

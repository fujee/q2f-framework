import { describe, expect, it } from 'vitest'
import type { QuestionDefinition } from '@/domain/qd/model'
import type { QuestionFormDefinition } from '@/domain/qfd/model'
import { resolveRealizedStimulusContent } from './renderContext'
import { buildHtmlFragment } from './htmlFragment'
import {
  q1Qd,
  q1QfdPaper,
  q3Qd,
  q3QfdPaper,
  q4Qd,
  q4QfdPaper,
  q4QfdWeb,
  q7Qd,
  q7QfdPaper,
  q8aQd,
  q8aQfdPaper,
  q8bQd,
  q8bQfdPaper,
  q9Qd,
  q9QfdWeb,
  q10Qd,
  q10QfdPaper,
} from '@/domain/qfd/fixtures/qfdFixtures'

const DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

const qd: QuestionDefinition = {
  id: 'qd-img',
  status: 'Draft',
  categories: [],
  responseInteractions: [
    {
      id: 'si',
      code: 'SI',
      type: 'ShortInput',
      inputType: 'Number',
      correctValues: [1],
    },
  ],
  stimuli: [
    {
      id: 'img1',
      code: 'IMG',
      type: 'Image',
      description: 'A diagram',
      materializationPolicy: 'SpecificationBased',
      contentSpecification: 'Render a diagram.',
    },
  ],
  interactionStimulusAssociations: [
    { id: 'a1', interactionRef: 'si', stimulusRef: 'img1', role: 'Context' },
  ],
  constraints: [],
}

const qfd: QuestionFormDefinition = {
  id: 'qfd-img',
  questionDefinitionRef: 'qd-img',
  targetProfileRef: 'InteractiveWebProfile',
  interactionRealizations: [
    { id: 'ir-si', interactionRef: 'si', mechanism: 'ShortEntry' },
  ],
  stimulusRealizations: [
    {
      id: 'sr-img1',
      stimulusRef: 'img1',
      mode: 'MaterializeFromSpecification',
      realizedContent: DATA_URL,
    },
  ],
  rootLayout: {
    kind: 'Stack',
    direction: 'Vertical',
    children: [
      { kind: 'StimulusBlock', stimulusRealizationRef: 'sr-img1' },
      { kind: 'InteractionBlock', interactionRealizationRef: 'ir-si' },
    ],
  },
}

describe('materialized image content propagates to the renderer', () => {
  it('resolves realizedContent for a MaterializeFromSpecification image', () => {
    const sr = qfd.stimulusRealizations[0]
    const content = resolveRealizedStimulusContent(qd.stimuli[0], sr)
    expect(content).toBe(DATA_URL)
  })

  it('emits the materialized image into the static rendering', () => {
    const html = buildHtmlFragment(qd, qfd)
    expect(html).toContain('<img')
    expect(html).toContain(DATA_URL)
  })

  it('still renders QD-authored image sources when reused', () => {
    const reused: QuestionDefinition = {
      ...qd,
      stimuli: [
        {
          id: 'img1',
          code: 'IMG',
          type: 'Image',
          description: 'A diagram',
          materializationPolicy: 'Fixed',
          source: '/assets/qd.png',
        },
      ],
    }
    const reusedQfd: QuestionFormDefinition = {
      ...qfd,
      stimulusRealizations: [
        { id: 'sr-img1', stimulusRef: 'img1', mode: 'ReuseSource' },
      ],
    }
    expect(
      resolveRealizedStimulusContent(
        reused.stimuli[0],
        reusedQfd.stimulusRealizations[0]
      )
    ).toBe('/assets/qd.png')
    expect(buildHtmlFragment(reused, reusedQfd)).toContain(
      'src="/assets/qd.png"'
    )
  })

  it('preserves horizontal (x) placement of stacked canvas elements', () => {
    const canvasQfd: QuestionFormDefinition = {
      id: 'qfd-canvas-x',
      questionDefinitionRef: 'qd-img',
      targetProfileRef: 'InteractiveWebProfile',
      interactionRealizations: [
        { id: 'ir-si', interactionRef: 'si', mechanism: 'ShortEntry' },
      ],
      stimulusRealizations: [],
      rootLayout: {
        kind: 'Canvas',
        items: [
          {
            child: { kind: 'StimulusBlock', stimulusRealizationRef: 'sr-img1' },
            area: { x: 0, y: 0, width: 0.4, height: 0.2 },
            layer: 0,
          },
          {
            child: { kind: 'StimulusBlock', stimulusRealizationRef: 'sr-img1' },
            area: { x: 0.3, y: 0.35, width: 0.4, height: 0.2 },
            layer: 0,
          },
        ],
      },
    }
    const html = buildHtmlFragment(qd, canvasQfd)
    expect(html).toContain('left:0%')
    expect(html).toContain('left:30%')
  })
})

describe('paper realization and question text', () => {
  it('renders completing gaps as prominent drop-zone answer areas with a printed option pool, not a dropdown', () => {
    const html = buildHtmlFragment(q4Qd, q4QfdPaper)
    expect(html).not.toContain('<select')
    expect(html).toContain('qfd-dropzone')
    expect(html).toContain('Options:')
    expect(html).toContain('carbon dioxide')
  })

  it('renders Q10 workspace drop zones as filled, not underline, answer areas', () => {
    const html = buildHtmlFragment(q10Qd, q10QfdPaper)
    expect(html).toContain('qfd-dropzone')
    expect(html).toContain('qfd-dropzone-fill')
    expect(html).not.toContain('qfd-blank-wide')
  })

  it('renders image completing options as images, not base64 text', () => {
    const qd: QuestionDefinition = {
      id: 'qd-img-items',
      status: 'Draft',
      categories: [],
      responseInteractions: [
        {
          id: 'cmp',
          code: 'CMP',
          type: 'Completing',
          localContent: 'Pick the image: {{g1}}.',
          completingItems: [
            {
              id: 'img-item',
              code: 'img',
              type: 'ImageCompletingItem',
              imageRef: DATA_URL,
              usageLimit: 1,
            },
          ],
          completingGaps: [
            {
              id: 'g1',
              code: 'g1',
              type: 'DropTargetGap',
              anchor: { kind: 'TextAnchor', marker: '{{g1}}' },
              correctItemRefs: ['img-item'],
            },
          ],
        },
      ],
      stimuli: [],
      interactionStimulusAssociations: [],
      constraints: [],
    }
    const qfd: QuestionFormDefinition = {
      id: 'qfd-img-items',
      questionDefinitionRef: 'qd-img-items',
      targetProfileRef: 'ConventionalPaperProfile',
      interactionRealizations: [
        { id: 'ir-cmp', interactionRef: 'cmp', mechanism: 'Completion' },
      ],
      stimulusRealizations: [],
      rootLayout: {
        kind: 'Inline',
        items: [
          {
            child: {
              kind: 'InteractionBlock',
              interactionRealizationRef: 'ir-cmp',
            },
          },
        ],
      },
    }
    const html = buildHtmlFragment(qd, qfd)
    expect(html).toContain('qfd-item-img')
    expect(html).toContain(`src="${DATA_URL}"`)
  })

  it('renders the QD instruction as the question text', () => {
    const html = buildHtmlFragment(q1Qd, q1QfdPaper)
    expect(html).toContain('Select exactly two noble gases.')
  })

  it('renders the TextSpan marking sentence once, not twice', () => {
    const html = buildHtmlFragment(q8bQd, q8bQfdPaper)
    const sentence = 'The enzyme catalyzes the reaction rapidly.'
    const occurrences = html.split(sentence).length - 1
    expect(occurrences).toBe(1)
    expect(html).toContain('Mark the verb phrase in the sentence.')
    // No interactive/web-like control is rendered on paper.
    expect(html).not.toContain('Mark the relevant part of the text above')
  })

  it('renders the Q8A marking image once, not twice', () => {
    const html = buildHtmlFragment(q8aQd, q8aQfdPaper)
    const occurrences = html.split('q8-shapes.png').length - 1
    expect(occurrences).toBe(1)
    expect(html).toContain('Place one point inside the circle.')
  })

  it('renders each placed SpatialSelection Choice at its canvas position', () => {
    const html = buildHtmlFragment(q9Qd, q9QfdWeb)
    expect(html).toContain('Triangle')
    expect(html).toContain('Circle')
    expect(html).toContain('Square')
  })

  it('renders the SpatialSelection instruction above the canvas, not inside it', () => {
    const html = buildHtmlFragment(q9Qd, q9QfdWeb)
    const canvasIdx = html.indexOf('class="qfd-canvas"')
    const instructionIdx = html.indexOf('Select the circle.')
    expect(instructionIdx).toBeGreaterThanOrEqual(0)
    expect(instructionIdx).toBeLessThan(canvasIdx)
  })
})

describe('canvas-hosted interaction and stack orientation', () => {
  it('renders a Completion Interaction hosted directly in a Canvas (not empty)', () => {
    const irId = q4QfdWeb.interactionRealizations[0].id
    const qfd: QuestionFormDefinition = {
      ...q4QfdWeb,
      rootLayout: {
        kind: 'Canvas',
        items: [
          {
            child: {
              kind: 'InteractionBlock',
              interactionRealizationRef: irId,
            },
            area: { x: 0, y: 0, width: 1, height: 1 },
            layer: 0,
          },
        ],
      },
    }
    const html = buildHtmlFragment(q4Qd, qfd)
    expect(html).not.toContain('[empty canvas]')
    expect(html).toContain('During photosynthesis, plants take in')
  })

  it('keeps Inline completion gaps in the text flow', () => {
    const html = buildHtmlFragment(q4Qd, q4QfdPaper)
    const sentence = 'During photosynthesis, plants take in'
    const idx = html.indexOf(sentence)
    expect(idx).toBeGreaterThanOrEqual(0)
    const after = html.slice(idx, idx + sentence.length + 120)
    expect(after).not.toContain('<br')
  })

  it('renders Horizontal and Vertical stacks with different flex directions', () => {
    const children = [
      { kind: 'InteractionBlock' as const, interactionRealizationRef: 'ir-q1' },
    ]
    const horizontal = buildHtmlFragment(q1Qd, {
      ...q1QfdPaper,
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Horizontal' as const,
        children,
      },
    })
    const vertical = buildHtmlFragment(q1Qd, {
      ...q1QfdPaper,
      rootLayout: {
        kind: 'Stack' as const,
        direction: 'Vertical' as const,
        children,
      },
    })
    expect(horizontal).toContain('flex-direction:row')
    expect(vertical).toContain('flex-direction:column')
  })
})

describe('paper Relating realization', () => {
  it('renders both relating sets', () => {
    const html = buildHtmlFragment(q3Qd, q3QfdPaper)
    // Source set (countries)
    expect(html).toContain('France')
    expect(html).toContain('Italy')
    expect(html).toContain('Spain')
    // Target set (capitals)
    expect(html).toContain('Paris')
    expect(html).toContain('Rome')
    expect(html).toContain('Madrid')
  })

  it('renders a physical submission requirement as an instruction, not an area', () => {
    const html = buildHtmlFragment(q7Qd, q7QfdPaper)
    expect(html).toContain('Physical submission required')
    expect(html).not.toContain('Physical submission area')
  })
})

describe('canvas stimulus placement is WYSIWYG', () => {
  const imgQd: QuestionDefinition = {
    id: 'qd-wysiwyg',
    status: 'Draft',
    categories: [],
    responseInteractions: [],
    stimuli: [
      {
        id: 'img',
        code: 'IMG',
        type: 'Image',
        description: 'A diagram',
        materializationPolicy: 'Fixed',
        source: '/assets/qd.png',
      },
    ],
    interactionStimulusAssociations: [],
    constraints: [],
  }

  function canvasWithStimulus(area: {
    x: number
    y: number
    width: number
    height: number
  }): QuestionFormDefinition {
    return {
      id: 'qfd-wysiwyg',
      questionDefinitionRef: 'qd-wysiwyg',
      targetProfileRef: 'InteractiveWebProfile',
      interactionRealizations: [],
      stimulusRealizations: [
        { id: 'sr-img', stimulusRef: 'img', mode: 'ReuseSource' },
      ],
      rootLayout: {
        kind: 'Canvas',
        items: [
          {
            child: { kind: 'StimulusBlock', stimulusRealizationRef: 'sr-img' },
            area,
            layer: 0,
          },
        ],
      },
    }
  }

  it('positions a centered stimulus at its exact canvas coordinates and fills its area', () => {
    const html = buildHtmlFragment(
      imgQd,
      canvasWithStimulus({ x: 0.25, y: 0.1, width: 0.5, height: 0.8 })
    )
    expect(html).toContain('left:25%')
    expect(html).toContain('top:10%')
    expect(html).toContain('width:50%')
    expect(html).toContain('height:80%')
    expect(html).toContain('qfd-canvas-img')
    expect(html).toContain('height:480px')
  })

  it('preserves right and bottom offsets for other stimulus positions', () => {
    const html = buildHtmlFragment(
      imgQd,
      canvasWithStimulus({ x: 0.6, y: 0.7, width: 0.35, height: 0.25 })
    )
    expect(html).toContain('left:60%')
    expect(html).toContain('top:70%')
    expect(html).toContain('width:35%')
    expect(html).toContain('height:25%')
  })

  it('renders overlay choices in the same coordinate system as the stimulus (Q9)', () => {
    const html = buildHtmlFragment(q9Qd, q9QfdWeb)
    // The circle choice sits at its normalized area, matching the editor.
    expect(html).toContain('left:37.5%')
    expect(html).toContain('top:20%')
  })
})

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { QuestionDefinition } from '@/domain/qd/model'
import type { QuestionFormDefinition } from '@/domain/qfd/model'
import { FROZEN_PRIMARY_CASES } from '@/domain/evaluation/frozenProtocolFixtures'
import { QfdPreview } from './RenderPreview'
import { buildHtmlFragment } from './htmlFragment'
import {
  acceptsRendererMarkingResponse,
  appendPointMark,
  appendRegionMark,
  appendTextSpanMark,
} from './markingResponse'
import { moveOrderingItem } from './orderingResponse'

function primary(id: string) {
  const value = FROZEN_PRIMARY_CASES.find((candidate) => candidate.id === id)
  if (!value) throw new Error(`Missing frozen case ${id}`)
  return value
}

function preview(qd: QuestionDefinition, qfd: QuestionFormDefinition): string {
  return renderToStaticMarkup(<QfdPreview qd={qd} qfd={qfd} />)
}

function inputCompleting(responsePlacement: 'Embedded' | 'Referenced'): {
  qd: QuestionDefinition
  qfd: QuestionFormDefinition
} {
  const qd: QuestionDefinition = {
    id: `input-${responsePlacement}`,
    responseInteractions: [
      {
        id: 'complete-input',
        type: 'Completing',
        completingItems: [],
        completingGaps: [
          {
            id: 'input-gap',
            type: 'InputGap',
            workspaceStimulusRef: 'text-workspace',
            inputType: 'Text',
            correctValues: ['answer'],
          },
        ],
      },
    ],
    stimuli: [
      {
        id: 'text-workspace',
        sourceContent: 'Complete this sentence.',
        allowedModalities: ['Text'],
        materializationPolicy: 'Fixed',
      },
    ],
    associations: [
      {
        interactionRef: 'complete-input',
        stimulusRef: 'text-workspace',
        role: 'Workspace',
      },
    ],
    constraints: [],
  }
  const qfd: QuestionFormDefinition = {
    questionDefinitionRef: qd.id,
    targetProfileRef: 'InteractiveWebProfile',
    stimulusRealizations: [
      {
        id: 'input-sr',
        stimulusRef: 'text-workspace',
        servedInteractionRefs: ['complete-input'],
        realizedModality: 'Text',
        mode: 'PreserveContent',
      },
    ],
    interactionRealizations: [
      {
        type: 'CompletingRealization',
        interactionRef: 'complete-input',
        instructionRealizations: [],
        gapRealizations: [
          {
            type: 'InputGapRealization',
            gapRef: 'input-gap',
            stimulusRealizationRef: 'input-sr',
            responsePlacement,
            responseSite: { id: 'input-site' },
          },
        ],
      },
    ],
    interactionPrecedences: [],
    dependencyRealizations: [],
    rootLayout: {
      kind: 'LayoutGroup',
      orientation: 'Vertical',
      children: [
        {
          kind: 'LayoutPlacement',
          realizationRef: { kind: 'StimulusRealization', id: 'input-sr' },
        },
        ...(responsePlacement === 'Referenced'
          ? [
              {
                kind: 'LayoutPlacement' as const,
                realizationRef: {
                  kind: 'ResponseSiteRealization' as const,
                  id: 'input-site',
                },
              },
            ]
          : []),
      ],
    },
  }
  return { qd, qfd }
}

describe('concrete QFD renderer fidelity', () => {
  it('renders Expanded and Collapsed selection as different candidate controls', () => {
    const expanded = primary('Q1-ConventionalPaperProfile')
    const collapsed = primary('Q1-InteractiveWebProfile')
    const expandedHtml = preview(expanded.qd, expanded.qfd)
    const collapsedHtml = preview(collapsed.qd, collapsed.qfd)
    expect(expandedHtml).toContain('data-selection-mode="Expanded"')
    expect(expandedHtml).toContain('type="checkbox"')
    expect(expandedHtml).not.toContain('aria-label="Select response"')
    expect(collapsedHtml).toContain('data-selection-mode="Collapsed"')
    expect(collapsedHtml).toContain('aria-label="Select response"')
  })

  it('renders DirectSelection on the exact workspace and ReferencedSelection at its response site', () => {
    const direct = primary('Q9-InteractiveWebProfile')
    const referenced = primary('Q9-ConventionalPaperProfile')
    const directHtml = preview(direct.qd, direct.qfd)
    const referencedHtml = preview(referenced.qd, referenced.qfd)
    expect(directHtml).toContain('data-sr-id="q9-sr"')
    expect(directHtml).toContain('data-selection-mode="DirectSelection"')
    expect(directHtml).toContain('<button')
    expect(referencedHtml).toContain(
      'data-selection-mode="ReferencedSelection"'
    )
    expect(referencedHtml).toContain(
      'data-response-site-id="q9-reference-site"'
    )
    expect(referencedHtml).toContain('circle: Circle')
  })

  it('renders DirectOrdering controls while OrderNotation uses ranks', () => {
    const direct = primary('Q2-InteractiveWebProfile')
    const notation = primary('Q2-ConventionalPaperProfile')
    const directHtml = preview(direct.qd, direct.qfd)
    const notationHtml = preview(notation.qd, notation.qfd)
    expect(directHtml).toContain('data-ordering-mode="DirectOrdering"')
    expect(directHtml).toContain('aria-label="Move ')
    expect(notationHtml).toContain('data-ordering-mode="OrderNotation"')
    expect(notationHtml).toContain('aria-label="Rank ')
    expect(notationHtml).not.toContain('aria-label="Move ')
    expect(moveOrderingItem(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
  })

  it('uses Ordering localLayout for initial order and ElementPresentation text', () => {
    const frozen = primary('Q2-ConventionalPaperProfile')
    const qfd = structuredClone(frozen.qfd)
    const realization = qfd.interactionRealizations[0]
    if (
      realization.type !== 'OrderingRealization' ||
      realization.presentation.localLayout.kind !== 'LayoutGroup'
    )
      throw new Error('Expected ordering fixture')
    realization.presentation.itemPresentations[0].realizedText =
      'ORDER-FIRST-REALIZED'
    realization.presentation.itemPresentations.at(-1)!.realizedText =
      'ORDER-LAST-REALIZED'
    realization.presentation.localLayout.children.reverse()
    const html = preview(frozen.qd, qfd)
    expect(html.indexOf('ORDER-LAST-REALIZED')).toBeLessThan(
      html.indexOf('ORDER-FIRST-REALIZED')
    )
  })

  it('renders direct relation construction across typed sets and a separate notation response', () => {
    const direct = primary('Q3-InteractiveWebProfile')
    const notation = primary('Q3-ConventionalPaperProfile')
    const directHtml = preview(direct.qd, direct.qfd)
    const notationHtml = preview(notation.qd, notation.qfd)
    expect(directHtml).toContain(
      'data-relating-mode="DirectRelationConstruction"'
    )
    expect(directHtml).toContain('data-relating-set="Source"')
    expect(directHtml).toContain('data-relating-set="Target"')
    expect(notationHtml).toContain('data-relating-mode="RelationNotation"')
    expect(notationHtml).toContain('aria-label="Relation source notation"')
    expect(notationHtml).toContain('aria-label="Relation target notation"')
  })

  it('uses Relating labels, ElementPresentation text, and independent local set order', () => {
    const frozen = primary('Q3-InteractiveWebProfile')
    const qfd = structuredClone(frozen.qfd)
    const realization = qfd.interactionRealizations[0]
    if (realization.type !== 'RelatingRealization')
      throw new Error('Expected relating fixture')
    const source = realization.sourceSetPresentation
    const target = realization.targetSetPresentation
    const sourceLayout = source.localLayout
    const targetLayout = target.localLayout
    if (
      sourceLayout.kind !== 'LayoutGroup' ||
      targetLayout.kind !== 'LayoutGroup'
    )
      throw new Error('Expected relating local layouts')
    source.realizedLabel = 'REALIZED-SOURCE-LABEL'
    target.realizedLabel = 'REALIZED-TARGET-LABEL'
    source.elementPresentations[0].realizedText = 'SOURCE-FIRST'
    source.elementPresentations.at(-1)!.realizedText = 'SOURCE-LAST'
    target.elementPresentations[0].realizedText = 'TARGET-FIRST'
    target.elementPresentations.at(-1)!.realizedText = 'TARGET-LAST'
    sourceLayout.children.reverse()
    targetLayout.children.reverse()
    const html = preview(frozen.qd, qfd)
    expect(html).toContain('REALIZED-SOURCE-LABEL')
    expect(html).toContain('REALIZED-TARGET-LABEL')
    expect(html.indexOf('SOURCE-LAST')).toBeLessThan(
      html.indexOf('SOURCE-FIRST')
    )
    expect(html.indexOf('TARGET-LAST')).toBeLessThan(
      html.indexOf('TARGET-FIRST')
    )
  })

  it('renders embedded input on its workspace and referenced input at the exact response site', () => {
    const embedded = inputCompleting('Embedded')
    const referenced = inputCompleting('Referenced')
    const embeddedHtml = preview(embedded.qd, embedded.qfd)
    const referencedHtml = preview(referenced.qd, referenced.qfd)
    expect(embeddedHtml).toContain('data-response-placement="Embedded"')
    expect(embeddedHtml).not.toContain('data-response-site-id="input-site"')
    expect(referencedHtml).toContain('Response reference: input-gap')
    expect(referencedHtml).toContain('data-response-site-id="input-site"')
    expect(referencedHtml).toContain('data-response-placement="Referenced"')
  })

  it('renders DirectPlacement item source and ItemSelection controls as distinct forms', () => {
    const direct = primary('Q4-InteractiveWebProfile')
    const selection = primary('Q4-ConventionalPaperProfile')
    const directHtml = preview(direct.qd, direct.qfd)
    const selectionHtml = preview(selection.qd, selection.qfd)
    expect(directHtml).toContain('data-assignment-mode="DirectPlacement"')
    expect(directHtml).toContain('Place selected item at gap-1')
    expect(selectionHtml).toContain('data-selection-mode="Expanded"')
    expect(selectionHtml).toContain('data-gap-ref="gap-1"')
    expect(selectionHtml).not.toContain('qfd-item-source')
  })

  it('places referenced DirectPlacement and ItemSelection responses outside their workspace', () => {
    const direct = primary('Q4-InteractiveWebProfile')
    const directQfd = structuredClone(direct.qfd)
    const directRealization = directQfd.interactionRealizations[0]
    if (
      directRealization.type !== 'CompletingRealization' ||
      directRealization.gapRealizations[0].type !== 'ItemGapRealization' ||
      directQfd.rootLayout.kind !== 'LayoutGroup'
    )
      throw new Error('Expected direct completing fixture')
    const directGap = directRealization.gapRealizations[0]
    directGap.responsePlacement = 'Referenced'
    directGap.referencedPlacementSite = { id: 'referenced-placement-site' }
    directQfd.rootLayout.children.push({
      kind: 'LayoutPlacement',
      realizationRef: {
        kind: 'ResponseSiteRealization',
        id: 'referenced-placement-site',
      },
    })
    const directHtml = preview(direct.qd, directQfd)
    expect(directHtml).toContain('Response reference: gap-1')
    expect(directHtml).toContain(
      'data-response-site-id="referenced-placement-site"'
    )

    const selection = primary('Q4-ConventionalPaperProfile')
    const selectionQfd = structuredClone(selection.qfd)
    const selectionRealization = selectionQfd.interactionRealizations[0]
    if (
      selectionRealization.type !== 'CompletingRealization' ||
      selectionRealization.gapRealizations[0].type !== 'ItemGapRealization' ||
      !selectionRealization.gapRealizations[0].selectionPresentation ||
      selectionQfd.rootLayout.kind !== 'LayoutGroup'
    )
      throw new Error('Expected item-selection completing fixture')
    const selectionGap = selectionRealization.gapRealizations[0]
    const selectionPresentation = selectionGap.selectionPresentation
    if (!selectionPresentation)
      throw new Error('Expected selection presentation')
    selectionGap.responsePlacement = 'Referenced'
    selectionQfd.rootLayout.children.push({
      kind: 'LayoutPlacement',
      realizationRef: {
        kind: 'SelectionPresentation',
        id: selectionPresentation.id,
      },
    })
    const selectionHtml = preview(selection.qd, selectionQfd)
    expect(selectionHtml).toContain('Response reference: gap-1')
    expect(selectionHtml).toContain('data-response-placement="Referenced"')
  })

  it('uses itemSource localLayout order and completing-item realizedText', () => {
    const frozen = primary('Q4-InteractiveWebProfile')
    const qfd = structuredClone(frozen.qfd)
    const realization = qfd.interactionRealizations[0]
    if (realization.type !== 'CompletingRealization' || !realization.itemSource)
      throw new Error('Expected completing item source')
    const source = realization.itemSource
    const localLayout = source.localLayout
    if (localLayout.kind !== 'LayoutGroup')
      throw new Error('Expected item-source local layout')
    source.itemPresentations[0].realizedText = 'ITEM-FIRST'
    source.itemPresentations.at(-1)!.realizedText = 'ITEM-LAST'
    localLayout.children.reverse()
    const html = preview(frozen.qd, qfd)
    expect(html.indexOf('ITEM-LAST')).toBeLessThan(html.indexOf('ITEM-FIRST'))
  })

  it('uses localLayout order and realizedText instead of QD array order/content', () => {
    const frozen = primary('Q1-ConventionalPaperProfile')
    const qfd = structuredClone(frozen.qfd)
    const realization = qfd.interactionRealizations[0]
    if (
      realization.type !== 'SelectingRealization' ||
      !realization.standaloneSelection
    )
      throw new Error('Expected expanded selecting fixture')
    const presentation = realization.standaloneSelection
    const localLayout = presentation.localLayout
    if (localLayout.kind !== 'LayoutGroup')
      throw new Error('Expected local layout group')
    presentation.optionPresentations[0].realizedText = 'FIRST-REALIZED'
    presentation.optionPresentations.at(-1)!.realizedText = 'LAST-REALIZED'
    localLayout.children.reverse()
    const html = preview(frozen.qd, qfd)
    expect(html.indexOf('LAST-REALIZED')).toBeLessThan(
      html.indexOf('FIRST-REALIZED')
    )
    expect(html).not.toContain('>Helium<')
    expect(html).toContain('Oxygen')
  })

  it.each([
    ['Text', '<div class="whitespace-pre-wrap">'],
    ['Image', '<img'],
    ['Audio', '<audio'],
    ['Video', '<video'],
  ] as const)(
    'renders realized %s content with its actual media element',
    (modality, tag) => {
      const frozen = primary('Q5-InteractiveWebProfile')
      const qd = structuredClone(frozen.qd)
      const qfd = structuredClone(frozen.qfd)
      const stimulus = qd.stimuli[0]
      const realization = qfd.stimulusRealizations[0]
      stimulus.allowedModalities = [modality]
      stimulus.sourceContent =
        modality === 'Text' ? 'Concrete text' : `/media/concrete.${modality}`
      realization.realizedModality = modality
      realization.realizedContent = stimulus.sourceContent
      const html = preview(qd, qfd)
      expect(html).toContain(`data-modality="${modality}"`)
      expect(html).toContain(tag)
      expect(buildHtmlFragment(qd, qfd)).toContain(
        modality === 'Text' ? 'qfd-stimulus-content' : tag
      )
    }
  )

  it('binds Marking to the exact workspace and strictly accepts only renderer payloads', () => {
    const frozen = primary('Q8A-InteractiveWebProfile')
    const interaction = frozen.qd.responseInteractions[0]
    const realization = frozen.qfd.interactionRealizations[0]
    if (
      interaction.type !== 'Marking' ||
      realization.type !== 'MarkingRealization'
    )
      throw new Error('Expected point marking fixture')
    const html = preview(frozen.qd, frozen.qfd)
    expect(html).toContain('data-renderer-marking-surface="true"')
    expect(html).toContain(
      `data-workspace-realization-ref="${realization.workspaceRealizationRef}"`
    )
    const valid = {
      workspaceRealizationRef: realization.workspaceRealizationRef,
      marks: [{ kind: 'Point', offsetX: 12, offsetY: 8 }],
    }
    expect(
      acceptsRendererMarkingResponse(interaction, realization, valid)
    ).toBe(true)
    expect(acceptsRendererMarkingResponse(interaction, realization, [{}])).toBe(
      false
    )
    expect(
      acceptsRendererMarkingResponse(interaction, realization, {
        ...valid,
        workspaceRealizationRef: 'another-sr',
      })
    ).toBe(false)
    expect(
      acceptsRendererMarkingResponse(interaction, realization, {
        ...valid,
        marks: [{ kind: 'TextSpan', selectedText: 'circle' }],
      })
    ).toBe(false)
    expect(
      acceptsRendererMarkingResponse(interaction, realization, {
        ...valid,
        marks: [],
      })
    ).toBe(false)
    expect(
      acceptsRendererMarkingResponse(interaction, realization, {
        ...valid,
        marks: [valid.marks[0], valid.marks[0]],
      })
    ).toBe(false)
    expect(
      appendPointMark(undefined, realization.workspaceRealizationRef, 12, 8)
    ).toEqual(valid)
  })

  it('accepts non-empty TextSpan and renderer-local Region payloads for the exact workspace', () => {
    const frozen = primary('Q8B-InteractiveWebProfile')
    const interaction = frozen.qd.responseInteractions[0]
    const realization = frozen.qfd.interactionRealizations[0]
    if (
      interaction.type !== 'Marking' ||
      realization.type !== 'MarkingRealization'
    )
      throw new Error('Expected text marking fixture')
    const html = preview(frozen.qd, frozen.qfd)
    expect(html).toContain(
      `data-workspace-realization-ref="${realization.workspaceRealizationRef}"`
    )
    expect(html).toContain('data-mark-type="TextSpan"')
    const valid = appendTextSpanMark(
      undefined,
      realization.workspaceRealizationRef,
      'catalyzes'
    )
    expect(
      acceptsRendererMarkingResponse(interaction, realization, valid)
    ).toBe(true)
    const regionInteraction = { ...interaction, markType: 'Region' as const }
    const region = appendRegionMark(
      undefined,
      realization.workspaceRealizationRef,
      14,
      19,
      81,
      62
    )
    expect(
      acceptsRendererMarkingResponse(regionInteraction, realization, region)
    ).toBe(true)
    expect(
      acceptsRendererMarkingResponse(regionInteraction, realization, {
        ...region,
        workspaceRealizationRef: 'wrong-workspace',
      })
    ).toBe(false)
    expect(
      acceptsRendererMarkingResponse(regionInteraction, realization, {
        ...region,
        marks: [{ kind: 'Region', startOffsetX: 1, startOffsetY: 1 }],
      })
    ).toBe(false)
    expect(
      acceptsRendererMarkingResponse(regionInteraction, realization, {
        ...region,
        marks: [{ kind: 'Point', offsetX: 1, offsetY: 1 }],
      })
    ).toBe(false)
    const regionHtml = preview(
      {
        ...frozen.qd,
        responseInteractions: [{ ...interaction, markType: 'Region' }],
      },
      frozen.qfd
    )
    expect(regionHtml).toContain('data-mark-type="Region"')
    expect(regionHtml).toContain(
      'Drag across the workspace to mark a renderer-local region.'
    )
  })
})

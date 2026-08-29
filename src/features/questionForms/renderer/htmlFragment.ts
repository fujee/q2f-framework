import type { QuestionDefinition, ResponseInteraction } from '@/domain/qd/model'
import type {
  ElementPresentation,
  LayoutElement,
  QuestionFormDefinition,
  StimulusRealization,
} from '@/domain/qfd/model'
import {
  anchoredAffordances,
  buildRenderContext,
  indexedLayoutable,
  resolveRealizedStimulusContent,
  type IndexedLayoutable,
  type RenderContext,
} from './renderContext'

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export const FRAGMENT_STYLE = `
.qfd-layout { display:flex; gap:1rem; align-items:stretch; }
.qfd-layout-horizontal { flex-direction:row; }
.qfd-layout-vertical { flex-direction:column; }
.qfd-instruction { font-weight:600; }
.qfd-operational-guidance { color:#475569; }
.qfd-stimulus { border:1px solid #cbd5e1; border-radius:.5rem; padding:1rem; }
.qfd-stimulus img { max-width:100%; height:auto; }
.qfd-options, .qfd-elements { display:flex; flex-wrap:wrap; gap:.5rem; }
.qfd-option, .qfd-element, .qfd-affordance { border:1px solid #94a3b8; border-radius:.35rem; padding:.45rem .65rem; }
.qfd-response-site { min-height:2.25rem; border:1px dashed #64748b; border-radius:.35rem; padding:.45rem; }
.qfd-item-source { border-top:1px solid #cbd5e1; padding-top:.5rem; }
`

export class StaticDependencyUnsupportedError extends Error {
  constructor() {
    super(
      'Static HTML export cannot execute QFD dependency realizations; use the interactive renderer.'
    )
    this.name = 'StaticDependencyUnsupportedError'
  }
}

function interactionForElement(
  ctx: RenderContext,
  element: ElementPresentation
): ResponseInteraction | undefined {
  return ctx.interactions.get(element.elementRef.interactionRef)
}

function elementText(ctx: RenderContext, element: ElementPresentation): string {
  if (element.realizedText !== undefined) return element.realizedText
  const interaction = interactionForElement(ctx, element)
  if (!interaction) return element.id
  switch (element.elementRef.kind) {
    case 'Choice': {
      const choiceRef = element.elementRef.choiceRef
      return interaction.type === 'Selecting'
        ? (interaction.choices.find((choice) => choice.id === choiceRef)
            ?.semanticContent ?? choiceRef)
        : choiceRef
    }
    case 'OrderingItem': {
      const orderingItemRef = element.elementRef.orderingItemRef
      return interaction.type === 'Ordering'
        ? (interaction.orderingItems.find((item) => item.id === orderingItemRef)
            ?.semanticContent ?? orderingItemRef)
        : orderingItemRef
    }
    case 'RelatingElement': {
      const relatingElementRef = element.elementRef.relatingElementRef
      if (interaction.type !== 'Relating') return relatingElementRef
      const set =
        element.elementRef.set === 'Source'
          ? interaction.sourceSet
          : interaction.targetSet
      return (
        set.relatingElements.find(
          (candidate) => candidate.id === relatingElementRef
        )?.semanticContent ?? relatingElementRef
      )
    }
    case 'CompletingItem': {
      const completingItemRef = element.elementRef.completingItemRef
      return interaction.type === 'Completing'
        ? (interaction.completingItems.find(
            (item) => item.id === completingItemRef
          )?.semanticContent ?? completingItemRef)
        : completingItemRef
    }
  }
}

function renderElement(
  ctx: RenderContext,
  element: ElementPresentation
): string {
  return `<span class="qfd-element" data-element-id="${escapeHtml(element.id)}">${escapeHtml(elementText(ctx, element))}</span>`
}

function renderStimulus(
  ctx: RenderContext,
  realization: StimulusRealization
): string {
  const stimulus = ctx.stimuli.get(realization.stimulusRef)
  if (!stimulus) return ''
  const content = resolveRealizedStimulusContent(stimulus, realization)
  const body = content
    ? realization.realizedModality === 'Image'
      ? `<img src="${escapeHtml(content)}" alt="" />`
      : `<div class="qfd-stimulus-content">${escapeHtml(content)}</div>`
    : '<div class="qfd-stimulus-content-unavailable">Content unavailable</div>'
  const affordances = anchoredAffordances(ctx, realization.id)
    .map((affordance) => {
      const label = affordance.elementRef
        ? `${affordance.kind}: ${affordance.elementRef}`
        : affordance.kind
      return `<span class="qfd-affordance" data-owner-interaction="${escapeHtml(affordance.interactionRef)}" data-affordance-kind="${affordance.kind}">${escapeHtml(label)}</span>`
    })
    .join('')
  return `<section class="qfd-stimulus" data-sr-id="${escapeHtml(realization.id)}" data-mode="${realization.mode}" data-modality="${realization.realizedModality}">${body}${affordances ? `<div class="qfd-affordances">${affordances}</div>` : ''}</section>`
}

function renderResponseSite(
  ctx: RenderContext,
  ownerInteractionRef: string,
  id: string
): string {
  const interaction = ctx.interactions.get(ownerInteractionRef)
  const realization = ctx.interactionRealizations.get(ownerInteractionRef)
  if (!interaction || !realization) return ''
  let content = 'Response'
  switch (realization.type) {
    case 'SelectingRealization':
      content = 'Referenced selection response'
      break
    case 'OrderingRealization':
      content =
        realization.mode === 'OrderNotation'
          ? 'Order notation response'
          : 'Direct ordering response'
      break
    case 'RelatingRealization':
      content =
        realization.mode === 'RelationNotation'
          ? 'Relation notation response'
          : 'Direct relation response'
      break
    case 'CompletingRealization':
      content = 'Gap response'
      break
    case 'ShortInputRealization':
      content = `<input aria-label="Short response" type="text" />`
      break
    case 'EssayRealization':
      content = '<textarea aria-label="Essay response"></textarea>'
      break
    case 'ArtifactSubmissionRealization':
      content =
        realization.submissionMode === 'DigitalSubmission'
          ? '<input aria-label="Artifact submission" type="file" />'
          : 'Physical submission required'
      break
    case 'MarkingRealization':
      content = 'Marking workspace response'
      break
  }
  return `<div class="qfd-response-site" data-response-site-id="${escapeHtml(id)}" data-interaction-ref="${escapeHtml(ownerInteractionRef)}">${content}</div>`
}

type LocalCompositeEntry = Extract<
  IndexedLayoutable,
  {
    kind:
      | 'SelectionPresentation'
      | 'OrderingPresentation'
      | 'RelatingSetPresentation'
      | 'CompletingItemSourceRealization'
  }
>

function renderLayout(
  ctx: RenderContext,
  layout: LayoutElement,
  localScope?: LocalCompositeEntry
): string {
  if (layout.kind === 'LayoutGroup') {
    return `<div class="qfd-layout qfd-layout-${layout.orientation.toLowerCase()}" data-orientation="${layout.orientation}">${layout.children.map((child) => renderLayout(ctx, child, localScope)).join('')}</div>`
  }
  const entry = indexedLayoutable(
    ctx,
    layout.realizationRef,
    localScope ? { kind: localScope.kind, id: localScope.value.id } : undefined
  )
  if (!entry)
    return `<div class="qfd-missing-realization">Missing ${escapeHtml(layout.realizationRef.kind)} ${escapeHtml(layout.realizationRef.id)}</div>`
  switch (entry.kind) {
    case 'StimulusRealization':
      return renderStimulus(ctx, entry.value)
    case 'InstructionRealization': {
      const interaction = ctx.interactions.get(entry.ownerInteractionRef)
      const text =
        entry.value.realizedText ??
        (entry.value.role === 'TaskInstruction'
          ? interaction?.instruction
          : undefined)
      if (text === undefined) return ''
      const className =
        entry.value.role === 'TaskInstruction'
          ? 'qfd-instruction'
          : 'qfd-operational-guidance'
      return `<div class="${className}" data-instruction-role="${entry.value.role}">${escapeHtml(text)}</div>`
    }
    case 'ElementPresentation':
      return renderElement(ctx, entry.value)
    case 'SelectionPresentation':
      return `<div class="qfd-options" data-selection-mode="${entry.value.mode}">${renderLayout(ctx, entry.value.localLayout, entry)}</div>`
    case 'OrderingPresentation': {
      const realization = ctx.interactionRealizations.get(
        entry.ownerInteractionRef
      )
      const mode =
        realization?.type === 'OrderingRealization'
          ? realization.mode
          : 'DirectOrdering'
      return `<div class="qfd-ordering" data-ordering-mode="${mode}">${renderLayout(ctx, entry.value.localLayout, entry)}</div>`
    }
    case 'RelatingSetPresentation':
      return `<section class="qfd-relating-set">${entry.value.realizedLabel ? `<h4>${escapeHtml(entry.value.realizedLabel)}</h4>` : ''}${renderLayout(ctx, entry.value.localLayout, entry)}</section>`
    case 'CompletingItemSourceRealization':
      return `<section class="qfd-item-source"><strong>Options:</strong>${renderLayout(ctx, entry.value.localLayout, entry)}</section>`
    case 'ResponseSiteRealization':
      return renderResponseSite(ctx, entry.ownerInteractionRef, entry.value.id)
  }
}

/** Static export deliberately rejects conditional runtime behavior it cannot execute. */
export function buildHtmlFragment(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): string {
  if (qfd.dependencyRealizations.length > 0)
    throw new StaticDependencyUnsupportedError()
  const ctx = buildRenderContext(qd, qfd)
  return `<style>${FRAGMENT_STYLE}</style>${renderLayout(ctx, qfd.rootLayout)}`
}

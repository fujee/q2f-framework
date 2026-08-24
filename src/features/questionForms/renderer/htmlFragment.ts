import type { QuestionDefinition } from '@/domain/qd/model'
import type {
  Canvas,
  CanvasItem,
  ContentElement,
  Grid,
  Inline,
  LayoutElement,
  QuestionFormDefinition,
  Stack,
} from '@/domain/qfd/model'
import { findOwningInteractionId } from '@/domain/qfd/layout'
import { groupCanvasRows, rowGapPx, rowSpan } from './canvasLayout'
import {
  buildRenderContext,
  interactionBlockRendersWidget,
  resolveRealizedStimulusContent,
  type RenderContext,
} from './renderContext'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Self-contained styling for the exported fragment (no Tailwind dependency). */
export const FRAGMENT_STYLE = `
.qfd-root,.qfd-stack,.qfd-grid,.qfd-canvas,.qfd-inline{font-family:ui-sans-serif,system-ui,sans-serif;color:#111;font-size:14px;line-height:1.5}
.qfd-stack{display:flex;gap:12px}
.qfd-text{white-space:pre-wrap}
.qfd-instruction{margin-bottom:8px;color:#333;max-width:70ch}
.qfd-code{font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px;color:#555;margin-right:5px}
.qfd-list{display:flex;flex-direction:column;gap:6px}
.qfd-option{display:flex;align-items:center;gap:6px}
.qfd-img,.qfd-video{max-width:100%;max-height:320px;border-radius:6px}
.qfd-audio{width:100%}
.qfd-chip{display:inline-block;border:1px solid #bbb;border-radius:999px;padding:3px 10px;background:#fff;white-space:nowrap}
.qfd-blank{display:inline-block;min-width:110px;border-bottom:1px solid #555;vertical-align:baseline}
.qfd-blank-sm{min-width:48px}
.qfd-blank-wide{min-width:160px}
.qfd-bank{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}
.qfd-bank-label{font-size:11px;color:#555;margin-right:2px}
.qfd-essay{border:1px solid #999;border-radius:4px;min-height:110px}
.qfd-artifact{border:2px dashed #aaa;border-radius:6px;padding:22px;text-align:center;color:#555}
.qfd-artifact-note{border:1px solid #999;border-radius:6px;padding:14px;text-align:center;color:#333;font-size:13px}
.qfd-mark{position:relative;display:inline-block}
.qfd-mark-hint{position:absolute;bottom:6px;left:6px;background:rgba(255,255,255,.85);padding:2px 6px;border-radius:4px;font-size:11px;color:#555}
.qfd-missing{color:#b00}
.qfd-relate{display:flex;gap:40px}
.qfd-inline{line-height:2.2}
.qfd-canvas{border:1px dashed #bbb;border-radius:6px;padding:6px}
.qfd-abs{position:absolute;overflow:visible}
.qfd-order{margin:0;padding-left:22px}
.qfd-option-row{display:flex;align-items:center;gap:6px;padding:2px 0}
`

function substituteMarkers(
  text: string,
  replacements: { marker: string; html: string }[]
): string {
  if (replacements.length === 0) return escapeHtml(text).replace(/\n/g, '<br/>')
  const escaped = replacements.map((r) =>
    r.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  const regex = new RegExp(`(${escaped.join('|')})`, 'g')
  return text
    .split(regex)
    .map((piece) => {
      const match = replacements.find((r) => r.marker === piece)
      return match ? match.html : escapeHtml(piece)
    })
    .join('')
    .replace(/\n/g, '<br/>')
}

// ── Static content rendering ─────────────────────────────────────────────────

function stimulusHtml(ctx: RenderContext, srRef: string): string {
  const sr = ctx.stimulusRealizationById.get(srRef)
  const stimulus = sr ? ctx.stimulusById.get(sr.stimulusRef) : undefined
  if (!stimulus) return `<div class="qfd-missing">[missing stimulus]</div>`
  const content = resolveRealizedStimulusContent(stimulus, sr)
  switch (stimulus.type) {
    case 'Text':
      return `<div class="qfd-text">${escapeHtml(content ?? '').replace(/\n/g, '<br/>')}</div>`
    case 'Image':
      return content
        ? `<img class="qfd-img" src="${escapeHtml(content)}" alt="${escapeHtml(stimulus.code)}"/>`
        : `<div class="qfd-missing">[no image content]</div>`
    case 'Audio':
      return content
        ? `<audio class="qfd-audio" controls src="${escapeHtml(content)}"></audio>`
        : `<div class="qfd-missing">[no audio content]</div>`
    case 'Video':
      return content
        ? `<video class="qfd-video" controls src="${escapeHtml(content)}"></video>`
        : `<div class="qfd-missing">[no video content]</div>`
  }
}

function staticGapInput(gap: { type: string }): string {
  switch (gap.type) {
    case 'TextInputGap':
      return `<span class="qfd-blank">&nbsp;</span>`
    case 'NumberInputGap':
      return `<span class="qfd-blank qfd-blank-sm">&nbsp;</span>`
    case 'DateInputGap':
      return `<span class="qfd-blank">&nbsp;</span>`
    case 'DropTargetGap':
      return `<span class="qfd-blank qfd-blank-wide">&nbsp;</span>`
  }
  return ''
}

/** Printed (non-interactive) option pool for paper completion items. */
function completingBankHtml(
  completingItems: {
    id: string
    type: string
    text?: string
    imageRef?: string
  }[]
): string {
  if (completingItems.length === 0) return ''
  return `<div class="qfd-bank"><span class="qfd-bank-label">Options:</span>${completingItems
    .map(
      (it) =>
        `<span class="qfd-chip">${escapeHtml(
          it.type === 'TextCompletingItem'
            ? (it.text ?? '')
            : (it.imageRef ?? '')
        )}</span>`
    )
    .join('')}</div>`
}

function interactionInstructionHtml(ctx: RenderContext, irRef: string): string {
  const ir = ctx.interactionRealizationById.get(irRef)
  const interaction = ir
    ? ctx.interactionById.get(ir.interactionRef)
    : undefined
  if (!ir || !interaction) return ''
  const instruction = ir.realizedInstruction?.trim() || interaction.instruction
  return instruction
    ? `<div class="qfd-instruction">${escapeHtml(instruction).replace(/\n/g, '<br/>')}</div>`
    : ''
}

function interactionWidgetHtml(ctx: RenderContext, irRef: string): string {
  const ir = ctx.interactionRealizationById.get(irRef)
  const interaction = ir
    ? ctx.interactionById.get(ir.interactionRef)
    : undefined
  if (!ir || !interaction) return ''

  let widget = ''
  switch (ir.mechanism) {
    case 'ListSelection':
      if (interaction.type === 'Selecting') {
        const inputType = interaction.maxSelections === 1 ? 'radio' : 'checkbox'
        widget = `<div class="qfd-list">${interaction.choices
          .map(
            (c) =>
              `<label class="qfd-option"><input type="${inputType}" disabled/> <span class="qfd-code">${escapeHtml(c.code)}</span>${escapeHtml(c.name)}</label>`
          )
          .join('')}</div>`
      }
      break
    case 'SpatialSelection':
      widget = '' // choices rendered via placed ResponseElementBlocks
      break
    case 'DirectOrdering':
      if (interaction.type === 'Ordering') {
        widget = `<ol class="qfd-order">${interaction.orderingItems
          .map(
            (i) =>
              `<li><span class="qfd-code">${escapeHtml(i.code)}</span>${escapeHtml(i.name)}</li>`
          )
          .join('')}</ol>`
      }
      break
    case 'OrderNotation':
      if (interaction.type === 'Ordering') {
        widget = `<div class="qfd-list">${interaction.orderingItems
          .map(
            (i) =>
              `<div class="qfd-option-row"><span class="qfd-code">${escapeHtml(i.code)}</span><span style="flex:1">${escapeHtml(i.name)}</span><span class="qfd-blank qfd-blank-sm">&nbsp;</span></div>`
          )
          .join('')}</div>`
      }
      break
    case 'DirectRelationConstruction':
      if (interaction.type === 'Relating') {
        widget = `<div class="qfd-relate"><ul>${interaction.sourceSet.relatingElements
          .map(
            (s) =>
              `<li><span class="qfd-code">${escapeHtml(s.code)}</span>${escapeHtml(s.name)}</li>`
          )
          .join('')}</ul><ul>${interaction.targetSet.relatingElements
          .map(
            (t) =>
              `<li><span class="qfd-code">${escapeHtml(t.code)}</span>${escapeHtml(t.name)}</li>`
          )
          .join('')}</ul></div>`
      }
      break
    case 'RelationNotation':
      if (interaction.type === 'Relating') {
        // Paper relation notation shows BOTH relating sets: source items with
        // a blank field to write the matched target code, and the full target
        // set (with codes) as the reference side.
        const sources = `<div class="qfd-list">${interaction.sourceSet.relatingElements
          .map(
            (s) =>
              `<div class="qfd-option-row"><span class="qfd-code">${escapeHtml(s.code)}</span><span style="flex:1">${escapeHtml(s.name)}</span><span class="qfd-blank qfd-blank-sm">&nbsp;</span></div>`
          )
          .join('')}</div>`
        const targets = `<div class="qfd-list">${interaction.targetSet.relatingElements
          .map(
            (t) =>
              `<div class="qfd-option-row"><span class="qfd-code">${escapeHtml(t.code)}</span>${escapeHtml(t.name)}</div>`
          )
          .join('')}</div>`
        widget = `<div class="qfd-relate">${sources}${targets}</div>`
      }
      break
    case 'Completion':
      if (interaction.type === 'Completing') {
        const localGaps = interaction.completingGaps.filter(
          (g) => !g.stimulusRef
        )
        const content = interaction.localContent
        if (content) {
          const markerGaps = localGaps.filter(
            (g) => g.anchor?.kind === 'TextAnchor' && g.anchor.marker
          )
          if (markerGaps.length > 0) {
            widget = `<div class="qfd-text">${substituteMarkers(
              content,
              markerGaps.map((g) => ({
                marker: g.anchor?.kind === 'TextAnchor' ? g.anchor.marker : '',
                html: staticGapInput(g),
              }))
            )}</div>`
          } else {
            widget = `<div class="qfd-text">${escapeHtml(content).replace(/\n/g, '<br/>')}</div><div class="qfd-list">${localGaps
              .map((g) => staticGapInput(g))
              .join('')}</div>`
          }
          widget += completingBankHtml(interaction.completingItems)
        } else {
          widget = `<div class="qfd-list">${localGaps
            .map((g) => staticGapInput(g))
            .join('')}</div>`
        }
      }
      break
    case 'ShortEntry':
      if (interaction.type === 'ShortInput') {
        widget = `<span class="qfd-blank">&nbsp;</span>`
      }
      break
    case 'ExtendedTextEntry':
      widget = `<div class="qfd-essay"></div>`
      break
    case 'DigitalArtifactSubmission':
      widget = `<div class="qfd-artifact">Attach digital artifacts</div>`
      break
    case 'PhysicalArtifactSubmission':
      // A physical submission is a requirement, not an on-paper container.
      // Render a clear instruction instead of an empty drop-zone area.
      widget = `<div class="qfd-artifact-note"><strong>Physical submission required</strong><br/>Please attach/submit the required material as instructed.</div>`
      break
    case 'DirectMarking':
      if (interaction.type === 'Marking') {
        const assoc = ctx.associationsByInteractionId
          .get(interaction.id)
          ?.find((a) => a.role === 'Workspace')
        const stimulus = assoc
          ? ctx.stimulusById.get(assoc.stimulusRef)
          : undefined
        if (stimulus) {
          const content = resolveRealizedStimulusContent(
            stimulus,
            ctx.qfd.stimulusRealizations.find(
              (sr) => sr.stimulusRef === stimulus.id
            )
          )
          if (stimulus.type === 'Text') {
            // The workspace text is rendered by its own StimulusBlock; the QD
            // instruction (rendered by interactionHtml) tells the respondent
            // to mark the relevant part physically. No interactive control.
            widget = ''
          } else if (content) {
            widget = `<div class="qfd-mark"><img class="qfd-img" src="${escapeHtml(content)}" alt="${escapeHtml(stimulus.code)}"/><div class="qfd-mark-hint">Mark on the image</div></div>`
          }
        }
      }
      break
  }

  return widget
}

function interactionHtml(ctx: RenderContext, irRef: string): string {
  const ir = ctx.interactionRealizationById.get(irRef)
  const interaction = ir
    ? ctx.interactionById.get(ir.interactionRef)
    : undefined
  if (!ir || !interaction)
    return `<div class="qfd-missing">[missing interaction]</div>`
  return `<div>${interactionInstructionHtml(ctx, irRef)}${interactionWidgetHtml(ctx, irRef)}</div>`
}

function responseElementHtml(ctx: RenderContext, el: ContentElement): string {
  if (el.kind !== 'ResponseElementBlock') return ''
  const ownerId = findOwningInteractionId(ctx.qd, el.elementKind, el.elementRef)
  const owner = ownerId ? ctx.interactionById.get(ownerId) : undefined

  if (el.elementKind === 'Choice') {
    const choice =
      owner?.type === 'Selecting'
        ? owner.choices.find((c) => c.id === el.elementRef)
        : undefined
    return `<span class="qfd-chip"><span class="qfd-code">${escapeHtml(choice?.code ?? '?')}</span>${escapeHtml(choice?.name ?? '')}</span>`
  }
  if (el.elementKind === 'CompletingGap') {
    const gap = ctx.gapById.get(el.elementRef)
    return gap ? staticGapInput(gap) : ''
  }
  if (el.elementKind === 'OrderingItem') {
    const item =
      owner?.type === 'Ordering'
        ? owner.orderingItems.find((i) => i.id === el.elementRef)
        : undefined
    return `<span class="qfd-chip"><span class="qfd-code">${escapeHtml(item?.code ?? '?')}</span>${escapeHtml(item?.name ?? '')}</span>`
  }
  const element =
    owner?.type === 'Relating'
      ? [
          ...owner.sourceSet.relatingElements,
          ...owner.targetSet.relatingElements,
        ].find((e) => e.id === el.elementRef)
      : undefined
  return `<span class="qfd-chip"><span class="qfd-code">${escapeHtml(element?.code ?? '?')}</span>${escapeHtml(element?.name ?? '')}</span>`
}

function contentHtml(ctx: RenderContext, el: ContentElement): string {
  if (el.kind === 'StimulusBlock')
    return stimulusHtml(ctx, el.stimulusRealizationRef)
  if (el.kind === 'InteractionBlock')
    return interactionHtml(ctx, el.interactionRealizationRef)
  return responseElementHtml(ctx, el)
}

// ── Static container rendering ───────────────────────────────────────────────

function stackHtml(ctx: RenderContext, container: Stack): string {
  return `<div class="qfd-stack" style="flex-direction:${container.direction === 'Horizontal' ? 'row' : 'column'}">${container.children
    .map((c) => nodeHtml(ctx, c))
    .join('')}</div>`
}

function gridHtml(ctx: RenderContext, container: Grid): string {
  return `<div class="qfd-grid" style="display:grid;grid-template-columns:repeat(${container.columns},minmax(0,1fr));gap:12px">${container.items
    .map(
      (item) =>
        `<div style="grid-column:${item.column + 1} / span ${item.columnSpan};grid-row:${item.row + 1} / span ${item.rowSpan}">${nodeHtml(
          ctx,
          item.child
        )}</div>`
    )
    .join('')}</div>`
}

function spatialNodeHtml(ctx: RenderContext, el: LayoutElement): string {
  if (el.kind === 'InteractionBlock') {
    return interactionWidgetHtml(ctx, el.interactionRealizationRef)
  }
  return nodeHtml(ctx, el)
}

function canvasHtml(ctx: RenderContext, container: Canvas): string {
  // The instruction of an InteractionBlock is hoisted above the surface; its
  // widget (when it renders visible content) is placed spatially.
  const headers: string[] = []
  const spatialItems: CanvasItem[] = []
  for (const item of container.items) {
    if (item.child.kind === 'InteractionBlock') {
      const ref = item.child.interactionRealizationRef
      headers.push(interactionInstructionHtml(ctx, ref))
      if (interactionBlockRendersWidget(ctx, ref)) {
        spatialItems.push(item)
      }
      continue
    }
    spatialItems.push(item)
  }

  const rows = groupCanvasRows(spatialItems)
  const rowHtml =
    rows.length === 0
      ? '[empty canvas]'
      : rows
          .map((row, ri) => {
            const marginTop =
              ri === 0 ? 0 : rowGapPx(rows[ri - 1].bottom, row.top)
            const span = rowSpan(row)
            const overlays = row.overlay
              .map(
                (o) =>
                  `<div class="qfd-abs" style="left:${o.style.leftPct}%;top:${o.style.topPct}%;width:${o.style.widthPct}%;height:${o.style.heightPct}%">${spatialNodeHtml(
                    ctx,
                    o.item.child
                  )}</div>`
              )
              .join('')
            const baseHtml = `<div style="position:relative;margin-left:${
              row.base.area.x * 100
            }%;width:${
              row.base.area.width * 100
            }%">${spatialNodeHtml(ctx, row.base.child)}${overlays}</div>`
            const sideHtml = row.side
              .map(
                (item) =>
                  `<div class="qfd-abs" style="left:${item.area.x * 100}%;top:${
                    ((item.area.y - row.top) / span) * 100
                  }%;width:${item.area.width * 100}%">${spatialNodeHtml(
                    ctx,
                    item.child
                  )}</div>`
              )
              .join('')
            return `<div style="margin-top:${marginTop}px;position:relative">${baseHtml}${sideHtml}</div>`
          })
          .join('')
  return `${headers.join('')}<div class="qfd-canvas">${rowHtml}</div>`
}

function inlineHtml(ctx: RenderContext, container: Inline): string {
  const consumed = new Set<number>()
  const parts: string[] = []
  const anchored = container.items
    .map((item, i) => ({ item, i }))
    .filter(
      ({ item }) => item.anchor?.kind === 'TextAnchor' && item.anchor.marker
    )

  container.items.forEach((item, idx) => {
    if (consumed.has(idx)) return
    const child = item.child
    if (child.kind === 'StimulusBlock') {
      const sr = ctx.stimulusRealizationById.get(child.stimulusRealizationRef)
      const stimulus = sr ? ctx.stimulusById.get(sr.stimulusRef) : undefined
      const content = stimulus
        ? resolveRealizedStimulusContent(stimulus, sr)
        : undefined
      if (stimulus?.type === 'Text' && content) {
        const reps = anchored.filter(({ i }) => !consumed.has(i))
        if (reps.length > 0) {
          reps.forEach((r) => consumed.add(r.i))
          parts.push(
            substituteMarkers(
              content,
              reps.map((r) => ({
                marker:
                  r.item.anchor?.kind === 'TextAnchor'
                    ? r.item.anchor.marker
                    : '',
                html: nodeHtml(ctx, r.item.child),
              }))
            )
          )
          return
        }
      }
    }
    parts.push(nodeHtml(ctx, child))
  })

  return `<div class="qfd-inline">${parts.join('')}</div>`
}

function nodeHtml(ctx: RenderContext, el: LayoutElement): string {
  switch (el.kind) {
    case 'Stack':
      return stackHtml(ctx, el)
    case 'Grid':
      return gridHtml(ctx, el)
    case 'Canvas':
      return canvasHtml(ctx, el)
    case 'Inline':
      return inlineHtml(ctx, el)
    default:
      return contentHtml(ctx, el)
  }
}

/** Builds a self-contained HTML fragment (inline `<style>` + markup) presenting
 * the realized form. Used for the web HTML export and as the paper/PDF body. */
export function buildHtmlFragment(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): string {
  const ctx = buildRenderContext(qd, qfd)
  return `<style>${FRAGMENT_STYLE}</style><div class="qfd-root">${nodeHtml(ctx, qfd.rootLayout)}</div>`
}

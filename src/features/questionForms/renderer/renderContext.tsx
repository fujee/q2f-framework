import type {
  CompletingGap,
  InteractionStimulusAssociation,
  Marking,
  QuestionDefinition,
  ResponseInteraction,
  Stimulus,
} from '@/domain/qd/model'
import type {
  Canvas,
  CanvasArea,
  InteractionRealization,
  QuestionFormDefinition,
  ResponseElementKind,
  StimulusRealization,
} from '@/domain/qfd/model'
import { findOwningInteractionId } from '@/domain/qfd/layout'
import type { ReactNode } from 'react'

export interface RenderContext {
  qd: QuestionDefinition
  qfd: QuestionFormDefinition
  interactionById: Map<string, ResponseInteraction>
  stimulusById: Map<string, Stimulus>
  interactionRealizationById: Map<string, InteractionRealization>
  stimulusRealizationById: Map<string, StimulusRealization>
  associationsByInteractionId: Map<string, InteractionStimulusAssociation[]>
  gapById: Map<string, CompletingGap>
}

export function buildRenderContext(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): RenderContext {
  const associationsByInteractionId = new Map<
    string,
    InteractionStimulusAssociation[]
  >()
  for (const a of qd.interactionStimulusAssociations) {
    const list = associationsByInteractionId.get(a.interactionRef) ?? []
    list.push(a)
    associationsByInteractionId.set(a.interactionRef, list)
  }

  const gapById = new Map<string, CompletingGap>()
  for (const i of qd.responseInteractions) {
    if (i.type === 'Completing')
      for (const g of i.completingGaps) gapById.set(g.id, g)
  }

  return {
    qd,
    qfd,
    interactionById: new Map(qd.responseInteractions.map((i) => [i.id, i])),
    stimulusById: new Map(qd.stimuli.map((s) => [s.id, s])),
    interactionRealizationById: new Map(
      qfd.interactionRealizations.map((ir) => [ir.id, ir])
    ),
    stimulusRealizationById: new Map(
      qfd.stimulusRealizations.map((sr) => [sr.id, sr])
    ),
    associationsByInteractionId,
    gapById,
  }
}

/** ReuseSource shows the QD-authored content verbatim; Adapt/Materialize modes
 * show the QFD-provided realizedContent instead (renderer boundary, Section 19). */
export function resolveRealizedStimulusContent(
  stimulus: Stimulus,
  sr: StimulusRealization | undefined
): string | undefined {
  if (!sr || sr.mode === 'ReuseSource') {
    return stimulus.type === 'Text' ? stimulus.content : stimulus.source
  }
  return sr.realizedContent
}

export function findStimulusRealization(
  ctx: RenderContext,
  stimulusId: string
): StimulusRealization | undefined {
  return ctx.qfd.stimulusRealizations.find(
    (sr) => sr.stimulusRef === stimulusId
  )
}

/** The stimulus a Workspace role binds an interaction to, if any. */
export function workspaceStimulus(
  ctx: RenderContext,
  interactionId: string
): Stimulus | undefined {
  const assoc = ctx.associationsByInteractionId
    .get(interactionId)
    ?.find((a) => a.role === 'Workspace')
  return assoc ? ctx.stimulusById.get(assoc.stimulusRef) : undefined
}

/** Splits plain text on a set of markers, substituting each with its widget node
 * (used to inline gap-response widgets into their hosting stimulus text). */
export function splitByMarkers(
  text: string,
  replacements: { marker: string; node: ReactNode }[]
): ReactNode[] {
  if (replacements.length === 0) return [text]
  const escaped = replacements.map((r) =>
    r.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  const regex = new RegExp(`(${escaped.join('|')})`, 'g')
  return text.split(regex).map((piece, i) => {
    const match = replacements.find((r) => r.marker === piece)
    return match ? (
      <span key={i}>{match.node}</span>
    ) : (
      <span key={i}>{piece}</span>
    )
  })
}

/** Whether an interaction's mechanism widget renders visible content when its
 * InteractionBlock is hosted in a Canvas. SpatialSelection (choices placed
 * individually) and stimulus-hosted Completion render no inline widget; other
 * mechanisms (and local-content Completion) render their widget inline. */
export function interactionBlockRendersWidget(
  ctx: RenderContext,
  irRef: string
): boolean {
  const ir = ctx.interactionRealizationById.get(irRef)
  if (!ir) return false
  const interaction = ctx.interactionById.get(ir.interactionRef)
  if (!interaction) return false
  switch (ir.mechanism) {
    case 'SpatialSelection':
      return false
    case 'DirectMarking':
      // The marking surface is the workspace stimulus itself, which is rendered
      // by its own StimulusBlock; never render a second, standalone copy.
      return false
    case 'Completion':
      return interaction.type === 'Completing'
        ? Boolean(interaction.localContent) ||
            interaction.completingGaps.some((g) => !g.stimulusRef)
        : false
    default:
      return true
  }
}

/** A Completing gap whose concrete RegionAnchor position is defined by the QD,
 * resolved into absolute canvas coordinates relative to its hosting image. */
export interface AnchoredGapPlacement {
  elementRef: string
  area: CanvasArea
  layer: number
}

/** Computes QD-defined placements for Completing gaps that carry a concrete
 * RegionAnchor over their Workspace image. These gaps are positioned by the QD
 * (relative to the image) and must not be placed or repositioned in the QFD
 * layout editor; the renderer overlays them onto the hosting stimulus. Any
 * stale QFD placement of such a gap is ignored in favour of the QD anchor. */
export function anchoredCanvasGapPlacements(
  ctx: RenderContext,
  container: Canvas
): AnchoredGapPlacement[] {
  const stimulusSlots = new Map<string, { area: CanvasArea; layer: number }>()
  for (const item of container.items) {
    if (item.child.kind === 'StimulusBlock') {
      stimulusSlots.set(item.child.stimulusRealizationRef, {
        area: item.area,
        layer: item.layer,
      })
    }
  }

  const placements: AnchoredGapPlacement[] = []
  for (const item of container.items) {
    if (item.child.kind !== 'InteractionBlock') continue
    const ir = ctx.interactionRealizationById.get(
      item.child.interactionRealizationRef
    )
    if (!ir || ir.mechanism !== 'Completion') continue
    const interaction = ctx.interactionById.get(ir.interactionRef)
    if (!interaction || interaction.type !== 'Completing') continue
    const workspace = workspaceStimulus(ctx, interaction.id)
    if (!workspace || workspace.type !== 'Image') continue
    const sr = findStimulusRealization(ctx, workspace.id)
    if (!sr) continue
    const slot = stimulusSlots.get(sr.id)
    if (!slot) continue

    for (const gap of interaction.completingGaps) {
      if (gap.stimulusRef !== workspace.id) continue
      if (gap.anchor?.kind !== 'RegionAnchor') continue
      placements.push({
        elementRef: gap.id,
        area: {
          x: slot.area.x + gap.anchor.x * slot.area.width,
          y: slot.area.y + gap.anchor.y * slot.area.height,
          width: gap.anchor.width * slot.area.width,
          height: gap.anchor.height * slot.area.height,
        },
        layer: slot.layer + 1,
      })
    }
  }
  return placements
}

/** Whether a Completing gap has a concrete RegionAnchor, i.e. its position is
 * defined by the QD relative to the stimulus and must not come from the QFD. */
export function isQdAnchoredGap(ctx: RenderContext, gapId: string): boolean {
  return ctx.gapById.get(gapId)?.anchor?.kind === 'RegionAnchor'
}

/** The DirectMarking interaction whose Workspace is the given stimulus, if any.
 * Such a stimulus renders the marking surface, so its StimulusBlock must host
 * the interaction instead of rendering a duplicate stimulus. */
export function directMarkingForStimulus(
  ctx: RenderContext,
  stimulusId: string
): { interaction: Marking; ir: InteractionRealization } | undefined {
  for (const ir of ctx.qfd.interactionRealizations) {
    if (ir.mechanism !== 'DirectMarking') continue
    const interaction = ctx.interactionById.get(ir.interactionRef)
    if (interaction?.type !== 'Marking') continue
    if (workspaceStimulus(ctx, interaction.id)?.id === stimulusId) {
      return { interaction, ir }
    }
  }
  return undefined
}

/** The StimulusRealization id of the Workspace image that hosts a response
 * element, if its owning interaction integrates a Workspace image. Such
 * response elements (SpatialSelection choices, Completing gaps) are positioned
 * relative to the image, not against the Canvas — so the renderer must overlay
 * them on the stimulus block instead of placing them independently. */
export function imageWorkspaceSrRefForResponse(
  ctx: RenderContext,
  elementKind: ResponseElementKind,
  elementRef: string
): string | undefined {
  const ownerId = findOwningInteractionId(ctx.qd, elementKind, elementRef)
  if (!ownerId) return undefined
  const workspace = workspaceStimulus(ctx, ownerId)
  if (!workspace || workspace.type !== 'Image') return undefined
  return findStimulusRealization(ctx, workspace.id)?.id
}

import type {
  CompletingGap,
  InteractionStimulusAssociation,
  QuestionDefinition,
  ResponseInteraction,
  Stimulus,
} from '@/domain/qd/model'
import type {
  InteractionRealization,
  QuestionFormDefinition,
  StimulusRealization,
} from '@/domain/qfd/model'
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
    case 'Completion':
      return interaction.type === 'Completing'
        ? Boolean(interaction.localContent) ||
            interaction.completingGaps.some((g) => !g.stimulusRef)
        : false
    default:
      return true
  }
}

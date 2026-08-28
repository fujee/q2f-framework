import type { QuestionDefinition, Stimulus } from '@/domain/qd/model'
import type {
  ContentElement,
  ResponseElementKind,
  StimulusBlock,
} from '@/domain/qfd/model'
import type { QuestionFormDraft } from '../store/questionFormEditorStore'
import { stimulusRealizationRef } from './assembleQfd'

export function describeContentElement(
  el: ContentElement,
  qd: QuestionDefinition
): string {
  if (el.kind === 'StimulusBlock') {
    const stimulusId = el.stimulusRealizationRef.replace(/^sr-/, '')
    const stimulus = qd.stimuli.find((s) => s.id === stimulusId)
    return `Stimulus · ${stimulus?.code ?? stimulusId}`
  }
  if (el.kind === 'InteractionBlock') {
    const interactionId = el.interactionRealizationRef.replace(/^ir-/, '')
    const interaction = qd.responseInteractions.find(
      (i) => i.id === interactionId
    )
    return `Interaction · ${interaction?.code ?? interactionId}`
  }
  if (
    el.kind === 'ResponseElementBlock' &&
    el.elementKind === 'RelatingElement'
  ) {
    for (const interaction of qd.responseInteractions) {
      if (interaction.type !== 'Relating') continue
      const source = interaction.sourceSet.relatingElements.find(
        (x) => x.id === el.elementRef
      )
      if (source)
        return `${interaction.sourceSet.name}: ${source.code} · ${source.name}`
      const target = interaction.targetSet.relatingElements.find(
        (x) => x.id === el.elementRef
      )
      if (target)
        return `${interaction.targetSet.name}: ${target.code} · ${target.name}`
    }
    return `RelatingElement · ${el.elementRef}`
  }
  return `${el.elementKind} · ${findElementLabel(el.elementKind, el.elementRef, qd)}`
}

function findElementLabel(
  kind: ResponseElementKind,
  id: string,
  qd: QuestionDefinition
): string {
  for (const interaction of qd.responseInteractions) {
    if (kind === 'Choice' && interaction.type === 'Selecting') {
      const c = interaction.choices.find((x) => x.id === id)
      if (c) return c.code
    }
    if (kind === 'OrderingItem' && interaction.type === 'Ordering') {
      const item = interaction.orderingItems.find((x) => x.id === id)
      if (item) return item.code
    }
    if (kind === 'RelatingElement' && interaction.type === 'Relating') {
      const el = [
        ...interaction.sourceSet.relatingElements,
        ...interaction.targetSet.relatingElements,
      ].find((x) => x.id === id)
      if (el) return el.code
    }
    if (kind === 'CompletingGap' && interaction.type === 'Completing') {
      const g = interaction.completingGaps.find((x) => x.id === id)
      if (g) return g.code
    }
  }
  return id
}

export interface ResolvedStimulusBlock {
  stimulus: Stimulus
  content: string | undefined
}

/** Resolves a StimulusBlock to the QD Stimulus it realizes plus the concrete
 * content to display (QD source content for ReuseSource, realizedContent for
 * Adapt/Materialize modes). Uses the same id rules as the assembler so the
 * layout editor and the persisted QFD always agree on references. */
export function resolveStimulusBlock(
  el: StimulusBlock,
  qd: QuestionDefinition,
  draft: Pick<
    QuestionFormDraft,
    'stimulusRealizations' | 'stimulusRealizationIds'
  >
): ResolvedStimulusBlock | undefined {
  const stimulus = qd.stimuli.find(
    (s) => stimulusRealizationRef(draft, s.id) === el.stimulusRealizationRef
  )
  if (!stimulus) return undefined

  const draftSr = draft.stimulusRealizations[stimulus.id]
  const mode =
    draftSr?.mode ??
    (stimulus.materializationPolicy === 'SpecificationBased'
      ? 'MaterializeFromSpecification'
      : 'ReuseSource')

  const content =
    mode === 'ReuseSource'
      ? stimulus.type === 'Text'
        ? stimulus.content
        : stimulus.source
      : draftSr?.realizedContent?.trim()

  return { stimulus, content }
}

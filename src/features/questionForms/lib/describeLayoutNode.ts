import type { QuestionDefinition } from '@/domain/qd/model'
import type { ContentElement, ResponseElementKind } from '@/domain/qfd/model'

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

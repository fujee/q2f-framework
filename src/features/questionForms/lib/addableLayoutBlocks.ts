import type { QuestionDefinition } from '@/domain/qd/model'
import type { ContentElement } from '@/domain/qfd/model'
import { MECHANISM_DESCRIPTORS } from '@/domain/qfd/mechanisms/registry'
import { placeableElements } from './placeableElements'
import {
  interactionRealizationRef,
  requiredStimulusIds,
  stimulusRealizationRef,
} from './assembleQfd'
import { describeContentElement } from './describeLayoutNode'
import type { PlacedRefs } from './layoutTree'
import type { QuestionFormDraft } from '../store/questionFormEditorStore'

export interface AddableBlock {
  key: string
  label: string
  element: ContentElement
}

/** Candidate content blocks the author may still place in the layout tree.
 * Stimuli are always offered (repeated StimulusBlocks referencing the same
 * realization are legal per S2.4); interactions and Workspace-placed response
 * elements are hidden once placed once, since each needs exactly one. */
export function computeAddableBlocks(
  qd: QuestionDefinition,
  draft: QuestionFormDraft,
  placed: PlacedRefs
): AddableBlock[] {
  const blocks: AddableBlock[] = []

  for (const stimulusId of requiredStimulusIds(qd)) {
    const el: ContentElement = {
      kind: 'StimulusBlock',
      stimulusRealizationRef: stimulusRealizationRef(draft, stimulusId),
    }
    blocks.push({
      key: `stimulus-${stimulusId}`,
      label: describeContentElement(el, qd),
      element: el,
    })
  }

  for (const interaction of qd.responseInteractions) {
    if (!draft.mechanisms[interaction.id]) continue
    const ref = interactionRealizationRef(draft, interaction.id)
    if (placed.interactionRealizationRefs.includes(ref)) continue
    const el: ContentElement = {
      kind: 'InteractionBlock',
      interactionRealizationRef: ref,
    }
    blocks.push({
      key: `interaction-${interaction.id}`,
      label: describeContentElement(el, qd),
      element: el,
    })
  }

  // Response elements that a mechanism must place independently (every Choice
  // for SpatialSelection, every stimulus-hosted gap for Completion). Selecting
  // elements are placeable regardless of a Workspace association — the Canvas
  // coordinates themselves are the spatial reference for SpatialSelection.
  for (const interaction of qd.responseInteractions) {
    const mechanism = draft.mechanisms[interaction.id]
    if (
      !mechanism ||
      !MECHANISM_DESCRIPTORS[mechanism].requiresElementLevelPlacement
    )
      continue
    const workspaceStimulusId = qd.interactionStimulusAssociations.find(
      (a) => a.interactionRef === interaction.id && a.role === 'Workspace'
    )?.stimulusRef
    for (const { kind, id } of placeableElements(
      interaction,
      workspaceStimulusId ?? ''
    )) {
      const alreadyPlaced = placed.responseElements.some(
        (p) => p.elementKind === kind && p.elementRef === id
      )
      if (alreadyPlaced) continue
      const el: ContentElement = {
        kind: 'ResponseElementBlock',
        elementKind: kind,
        elementRef: id,
      }
      blocks.push({
        key: `${kind}-${id}`,
        label: describeContentElement(el, qd),
        element: el,
      })
    }
  }

  return blocks
}

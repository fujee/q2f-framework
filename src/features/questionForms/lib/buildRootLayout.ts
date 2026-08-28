import type { QuestionDefinition } from '@/domain/qd/model'
import type {
  CanvasItem,
  ContainerElement,
  InlineItem,
  LayoutElement,
} from '@/domain/qfd/model'
import { MECHANISM_DESCRIPTORS } from '@/domain/qfd/mechanisms/registry'
import type { QuestionFormDraft } from '../store/questionFormEditorStore'
import { placeableElements } from './placeableElements'
import {
  interactionRealizationRef,
  stimulusRealizationRef,
} from './assembleQfd'

/** Fraction of the Canvas height reserved at the top for the interaction's
 * instruction/question text. Relative (normalized), so it adapts to any Canvas
 * size instead of assuming a fixed pixel height. */
const INSTRUCTION_RESERVE_HEIGHT = 0.15

/** Default placeholder region for a placed response element, kept below the
 * reserved instruction band so suggested placements never cover the question
 * text at the top of the Interaction. */
const DEFAULT_REGION = {
  x: 0.05,
  y: INSTRUCTION_RESERVE_HEIGHT + 0.05,
  width: 0.2,
  height: 0.1,
}

/** Deterministic transformation assistance only (QFD plan Section 18 / S2.8): produces
 * a *suggested* root layout the author can freely edit afterwards in the Layout step.
 * Context stimuli are placed once, before the interactions that reference them;
 * Workspace pairs are grouped into one integrated container (Canvas for image hosts,
 * Inline for text hosts, or a plain Stack when the mechanism needs no element-level
 * placement) using placeholder positions the author is expected to refine. */
export function generateSuggestedRootLayout(
  qd: QuestionDefinition,
  draft: QuestionFormDraft
): ContainerElement {
  const stackChildren: LayoutElement[] = []
  const placedStimulusIds = new Set<string>()

  for (const interaction of qd.responseInteractions) {
    const mechanism = draft.mechanisms[interaction.id]
    if (!mechanism) continue // unresolved decision; surfaced as a validation finding in Review

    const irId = interactionRealizationRef(draft, interaction.id)
    const descriptor = MECHANISM_DESCRIPTORS[mechanism]
    const workspaceAssoc = qd.interactionStimulusAssociations.find(
      (a) => a.interactionRef === interaction.id && a.role === 'Workspace'
    )
    const contextAssocs = qd.interactionStimulusAssociations.filter(
      (a) => a.interactionRef === interaction.id && a.role === 'Context'
    )

    for (const assoc of contextAssocs) {
      if (placedStimulusIds.has(assoc.stimulusRef)) continue
      placedStimulusIds.add(assoc.stimulusRef)
      stackChildren.push({
        kind: 'StimulusBlock',
        stimulusRealizationRef: stimulusRealizationRef(
          draft,
          assoc.stimulusRef
        ),
      })
    }

    if (workspaceAssoc) {
      const stimulus = qd.stimuli.find(
        (s) => s.id === workspaceAssoc.stimulusRef
      )
      const stimulusBlock = {
        kind: 'StimulusBlock' as const,
        stimulusRealizationRef: stimulusRealizationRef(
          draft,
          workspaceAssoc.stimulusRef
        ),
      }
      const interactionBlock = {
        kind: 'InteractionBlock' as const,
        interactionRealizationRef: irId,
      }

      if (descriptor.requiresElementLevelPlacement) {
        const elements = placeableElements(
          interaction,
          workspaceAssoc.stimulusRef
        )
        if (stimulus?.type === 'Text') {
          const items: InlineItem[] = [
            { child: stimulusBlock },
            ...elements.map(({ kind, id }) => ({
              child: {
                kind: 'ResponseElementBlock' as const,
                elementKind: kind,
                elementRef: id,
              },
              anchor: undefined,
            })),
            { child: interactionBlock },
          ]
          stackChildren.push({ kind: 'Inline', items })
        } else {
          const items: CanvasItem[] = [
            {
              child: interactionBlock,
              area: { x: 0, y: 0, width: 1, height: 1 },
              layer: 0,
            },
            {
              child: stimulusBlock,
              area: { x: 0, y: 0, width: 1, height: 1 },
              layer: 1,
            },
            ...elements.map(({ kind, id }, i) => ({
              child: {
                kind: 'ResponseElementBlock' as const,
                elementKind: kind,
                elementRef: id,
              },
              area: DEFAULT_REGION,
              layer: i + 2,
            })),
          ]
          stackChildren.push({ kind: 'Canvas', items })
        }
      } else {
        // DirectMarking over a Workspace must integrate the interaction with
        // the stimulus: Inline for a text workspace, Canvas for an image
        // workspace. Other non-placement mechanisms keep a simple Stack.
        if (
          !descriptor.requiredLayoutCapabilities.has('Stack') &&
          descriptor.requiredLayoutCapabilities.has('Inline') &&
          stimulus?.type === 'Text'
        ) {
          stackChildren.push({
            kind: 'Inline',
            items: [{ child: stimulusBlock }, { child: interactionBlock }],
          })
        } else if (
          !descriptor.requiredLayoutCapabilities.has('Stack') &&
          descriptor.requiredLayoutCapabilities.has('Canvas')
        ) {
          stackChildren.push({
            kind: 'Canvas',
            items: [
              {
                child: interactionBlock,
                area: { x: 0, y: 0, width: 1, height: 1 },
                layer: 0,
              },
              {
                child: stimulusBlock,
                area: { x: 0, y: 0, width: 1, height: 1 },
                layer: 1,
              },
            ],
          })
        } else {
          stackChildren.push({
            kind: 'Stack',
            direction: 'Vertical',
            children: [stimulusBlock, interactionBlock],
          })
        }
      }
      placedStimulusIds.add(workspaceAssoc.stimulusRef)
    } else {
      // Honor the mechanism's required layout capabilities even without a
      // Workspace stimulus (e.g. SpatialSelection requires Canvas hosting).
      if (
        descriptor.requiredLayoutCapabilities.has('Canvas') &&
        !descriptor.requiredLayoutCapabilities.has('Stack')
      ) {
        // Canvas-only mechanism (SpatialSelection). Without a Workspace image
        // there is no base surface, so each selectable element is placed as a
        // ResponseElementBlock with an explicit region; the interaction block
        // anchors the instruction and the active response.
        const elements = descriptor.requiresElementLevelPlacement
          ? placeableElements(interaction, '')
          : []
        const items: CanvasItem[] = elements.map(({ kind, id }, i) => ({
          child: {
            kind: 'ResponseElementBlock' as const,
            elementKind: kind,
            elementRef: id,
          },
          area: {
            x: 0.05 + (i % 4) * 0.22,
            y: 0.4 + Math.floor(i / 4) * 0.25,
            width: 0.2,
            height: 0.15,
          },
          layer: 1,
        }))
        items.push({
          child: {
            kind: 'InteractionBlock',
            interactionRealizationRef: irId,
          },
          area: { x: 0, y: 0, width: 1, height: 1 },
          layer: 0,
        })
        stackChildren.push({ kind: 'Canvas', items })
      } else {
        stackChildren.push({
          kind: 'InteractionBlock',
          interactionRealizationRef: irId,
        })
      }
    }
  }

  return { kind: 'Stack', direction: 'Vertical', children: stackChildren }
}

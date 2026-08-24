import type { ResponseInteraction } from '@/domain/qd/model'
import type { ResponseElementKind } from '@/domain/qfd/model'

/** QD response elements that a Workspace-integrating mechanism must place
 * independently (e.g. every Choice for SpatialSelection, every stimulus-hosted
 * gap for Completion). */
export function placeableElements(
  interaction: ResponseInteraction,
  stimulusId: string
): { kind: ResponseElementKind; id: string }[] {
  if (interaction.type === 'Selecting') {
    return interaction.choices.map((c) => ({
      kind: 'Choice' as const,
      id: c.id,
    }))
  }
  if (interaction.type === 'Completing') {
    return interaction.completingGaps
      .filter((g) => g.stimulusRef === stimulusId)
      .map((g) => ({ kind: 'CompletingGap' as const, id: g.id }))
  }
  return []
}

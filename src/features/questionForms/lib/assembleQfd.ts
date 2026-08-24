import type { QuestionDefinition } from '@/domain/qd/model'
import type {
  InteractionRealization,
  QuestionFormDefinition,
  StimulusRealization,
} from '@/domain/qfd/model'
import type { QuestionFormDraft } from '../store/questionFormEditorStore'

export function requiredStimulusIds(qd: QuestionDefinition): Set<string> {
  return new Set(qd.interactionStimulusAssociations.map((a) => a.stimulusRef))
}

/** Stable, deterministic InteractionRealization id for an interaction: the
 * original id when editing an existing form, otherwise a derived `ir-*` id.
 * This is the single source of truth used by the layout editor, the suggest
 * helper, and the assembler so the author-built layout always references the
 * same ids that are actually persisted. */
export function interactionRealizationRef(
  draft: Pick<QuestionFormDraft, 'interactionRealizationIds'>,
  interactionId: string
): string {
  return draft.interactionRealizationIds[interactionId] ?? `ir-${interactionId}`
}

/** Stable, deterministic StimulusRealization id (see interactionRealizationRef). */
export function stimulusRealizationRef(
  draft: Pick<QuestionFormDraft, 'stimulusRealizationIds'>,
  stimulusId: string
): string {
  return draft.stimulusRealizationIds[stimulusId] ?? `sr-${stimulusId}`
}

/** Assembles a full QuestionFormDefinition (minus the server-assigned top-level
 * id) from the wizard's draft decisions. IR/SR ids are deterministic (`ir-*`/
 * `sr-*`) so the author-built layout tree (draft.rootLayout) can reference them.
 * Throws if the layout step has not produced a root layout yet. */
export function assembleQfd(
  qd: QuestionDefinition,
  draft: QuestionFormDraft
): Omit<QuestionFormDefinition, 'id'> {
  if (!draft.rootLayout) throw new Error('Root layout has not been defined yet')

  const interactionRealizations: InteractionRealization[] =
    qd.responseInteractions
      .filter((i) => !!draft.mechanisms[i.id])
      .map((i) => {
        const realizedInstruction = draft.realizedInstructions[i.id]?.trim()
        return {
          id: interactionRealizationRef(draft, i.id),
          interactionRef: i.id,
          mechanism: draft.mechanisms[
            i.id
          ] as InteractionRealization['mechanism'],
          ...(realizedInstruction ? { realizedInstruction } : {}),
        }
      })

  const requiredIds = requiredStimulusIds(qd)
  const stimulusRealizations: StimulusRealization[] = qd.stimuli
    .filter((s) => requiredIds.has(s.id))
    .map((s) => {
      const draftSr = draft.stimulusRealizations[s.id]
      const mode =
        draftSr?.mode ??
        (s.materializationPolicy === 'SpecificationBased'
          ? 'MaterializeFromSpecification'
          : 'ReuseSource')
      const realizedContent =
        mode === 'ReuseSource' ? undefined : draftSr?.realizedContent?.trim()
      return {
        id: stimulusRealizationRef(draft, s.id),
        stimulusRef: s.id,
        mode,
        ...(realizedContent ? { realizedContent } : {}),
      }
    })

  return {
    questionDefinitionRef: qd.id,
    targetProfileRef: draft.targetProfileRef,
    interactionRealizations,
    stimulusRealizations,
    rootLayout: draft.rootLayout,
  }
}

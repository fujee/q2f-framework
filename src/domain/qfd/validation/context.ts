import type { QuestionDefinition, ResponseInteraction } from '../../qd/model'
import type {
  InteractionRealization,
  QuestionFormDefinition,
  StimulusRealization,
} from '../model'
import type { QuestionFormProfile } from '../profiles/model'

export class QfdValidationContext {
  readonly qfd: QuestionFormDefinition
  readonly qd: QuestionDefinition
  readonly profile: QuestionFormProfile
  readonly interactionsById: Map<string, ResponseInteraction>
  readonly realizationsByInteraction: Map<string, InteractionRealization[]>
  readonly stimulusRealizationsById: Map<string, StimulusRealization[]>
  readonly stimulusIds: Set<string>
  readonly associationPairs: Set<string>

  constructor(
    qfd: QuestionFormDefinition,
    qd: QuestionDefinition,
    profile: QuestionFormProfile
  ) {
    this.qfd = qfd
    this.qd = qd
    this.profile = profile
    this.interactionsById = new Map(
      qd.responseInteractions.map((interaction) => [
        interaction.id,
        interaction,
      ])
    )
    this.stimulusIds = new Set(qd.stimuli.map(({ id }) => id))
    this.associationPairs = new Set(
      qd.associations.map(
        ({ interactionRef, stimulusRef }) => `${interactionRef}::${stimulusRef}`
      )
    )
    this.realizationsByInteraction = new Map()
    for (const realization of qfd.interactionRealizations) {
      const list =
        this.realizationsByInteraction.get(realization.interactionRef) ?? []
      list.push(realization)
      this.realizationsByInteraction.set(realization.interactionRef, list)
    }
    this.stimulusRealizationsById = new Map()
    for (const realization of qfd.stimulusRealizations) {
      const list = this.stimulusRealizationsById.get(realization.id) ?? []
      list.push(realization)
      this.stimulusRealizationsById.set(realization.id, list)
    }
  }

  stimulusRealization(id: string): StimulusRealization | undefined {
    const matches = this.stimulusRealizationsById.get(id) ?? []
    return matches.length === 1 ? matches[0] : undefined
  }

  serves(
    stimulusRealizationId: string,
    stimulusId: string,
    interactionId: string
  ): boolean {
    const realization = this.stimulusRealization(stimulusRealizationId)
    return Boolean(
      realization &&
      realization.stimulusRef === stimulusId &&
      realization.servedInteractionRefs.includes(interactionId)
    )
  }
}

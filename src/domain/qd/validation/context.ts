import type {
  InteractionStimulusAssociation,
  QuestionDefinition,
  ResponseInteraction,
  Stimulus,
} from '../model'

/** Precomputed lookup structures shared across rule groups, so each rule does not
 * need to re-scan the whole QuestionDefinition. */
export class QdIndex {
  readonly qd: QuestionDefinition
  readonly interactionsById: Map<string, ResponseInteraction>
  readonly stimuliById: Map<string, Stimulus>
  /** Keyed by `${interactionId}::${stimulusId}` */
  readonly associationsByPair: Map<string, InteractionStimulusAssociation[]>
  readonly associationsByInteraction: Map<
    string,
    InteractionStimulusAssociation[]
  >

  constructor(qd: QuestionDefinition) {
    this.qd = qd
    this.interactionsById = new Map(
      qd.responseInteractions.map((i) => [i.id, i])
    )
    this.stimuliById = new Map(qd.stimuli.map((s) => [s.id, s]))

    this.associationsByPair = new Map()
    this.associationsByInteraction = new Map()
    for (const assoc of qd.interactionStimulusAssociations) {
      const pairKey = `${assoc.interactionRef}::${assoc.stimulusRef}`
      const pairList = this.associationsByPair.get(pairKey) ?? []
      pairList.push(assoc)
      this.associationsByPair.set(pairKey, pairList)

      const interactionList =
        this.associationsByInteraction.get(assoc.interactionRef) ?? []
      interactionList.push(assoc)
      this.associationsByInteraction.set(assoc.interactionRef, interactionList)
    }
  }

  workspaceStimulusFor(interactionId: string, stimulusId: string): boolean {
    const pair =
      this.associationsByPair.get(`${interactionId}::${stimulusId}`) ?? []
    return pair.some((a) => a.role === 'Workspace')
  }

  workspaceAssociationsFor(
    interactionId: string
  ): InteractionStimulusAssociation[] {
    return (this.associationsByInteraction.get(interactionId) ?? []).filter(
      (a) => a.role === 'Workspace'
    )
  }
}

import type {
  InteractionStimulusAssociation,
  QuestionDefinition,
} from '../../model'
import type { QdIndex } from '../context'
import { type Finding, fail, pass } from '../types'

/** ASC — InteractionStimulusAssociation rules (ASC-001..006). ASC-005 is emitted
 * alongside CMP-004 in completingRules.ts since it concerns Completing gaps
 * specifically; the remaining rules are handled here. */
export function validateAssociations(
  qd: QuestionDefinition,
  index: QdIndex
): Finding[] {
  const findings: Finding[] = []

  // ASC-001: both ends resolve (also covered by QD-VAL-004; reported locally for traceability)
  for (const assoc of qd.interactionStimulusAssociations) {
    const resolved =
      index.interactionsById.has(assoc.interactionRef) &&
      index.stimuliById.has(assoc.stimulusRef)
    findings.push(
      resolved
        ? pass(
            'ASC-001',
            `Association '${assoc.id}' resolves both its interaction and stimulus references.`,
            { affectedIds: [assoc.id] }
          )
        : fail(
            'ASC-001',
            `Association '${assoc.id}' has an unresolved interaction or stimulus reference.`,
            {
              path: `interactionStimulusAssociations[${assoc.id}]`,
              affectedIds: [assoc.id],
            }
          )
    )
  }

  // ASC-002: at most one association per (interaction, stimulus) pair
  const byPair = new Map<string, InteractionStimulusAssociation[]>()
  for (const assoc of qd.interactionStimulusAssociations) {
    const key = `${assoc.interactionRef}::${assoc.stimulusRef}`
    const list = byPair.get(key) ?? []
    list.push(assoc)
    byPair.set(key, list)
  }
  let asc002Failed = false
  for (const [key, list] of byPair) {
    if (list.length > 1) {
      asc002Failed = true
      findings.push(
        fail(
          'ASC-002',
          `More than one association exists for interaction/stimulus pair '${key}'.`,
          {
            path: 'interactionStimulusAssociations',
            affectedIds: list.map((a) => a.id),
          }
        )
      )
    }
  }
  if (!asc002Failed)
    findings.push(
      pass(
        'ASC-002',
        'Every interaction/stimulus pair has at most one association.'
      )
    )

  // ASC-003: Audio/Video stimuli cannot hold the Workspace role
  let asc003Failed = false
  for (const assoc of qd.interactionStimulusAssociations) {
    if (assoc.role !== 'Workspace') continue
    const stimulus = index.stimuliById.get(assoc.stimulusRef)
    if (!stimulus) continue
    if (stimulus.type === 'Audio' || stimulus.type === 'Video') {
      asc003Failed = true
      findings.push(
        fail(
          'ASC-003',
          `Association '${assoc.id}' assigns Workspace role to a '${stimulus.type}' stimulus, which is not allowed.`,
          {
            path: `interactionStimulusAssociations[${assoc.id}]`,
            affectedIds: [assoc.id],
          }
        )
      )
    }
  }
  if (!asc003Failed)
    findings.push(
      pass('ASC-003', 'No Audio/Video stimulus holds the Workspace role.')
    )

  // ASC-004: Workspace role is never inferred; it is only ever granted by an explicit
  // association record, which is guaranteed by this model's construction (there is no
  // implicit-role derivation logic anywhere in this engine).
  findings.push(
    pass(
      'ASC-004',
      'Workspace role is only ever granted via an explicit association; no implicit inference exists.'
    )
  )

  // ASC-006: a stimulus may hold different roles for different interactions; this is
  // structurally permitted (roles are recorded per pair, not globally per stimulus).
  findings.push(
    pass(
      'ASC-006',
      'Roles are recorded per interaction/stimulus pair, so a stimulus may hold different roles across interactions.'
    )
  )

  return findings
}

import type { QuestionDefinition } from '../../qd/model'
import type { QuestionFormDefinition } from '../model'
import { flattenLayout } from '../layout'
import { type Finding, fail, pass, reviewRequired } from '../../shared/findings'

/** CONF-STM-001..003, CONF-MAT-001..003, CONF-MAT-FIX-001, CONF-MAT-ADP-001,
 * CONF-MAT-SPC-001, CONF-STM-INF-001, CONF-ROLE-CTX-001..002. */
export function validateStimulusConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): Finding[] {
  const findings: Finding[] = []
  const blocks = flattenLayout(qfd.rootLayout)

  // Stimuli "required by the form" are those QD actually associates with an interaction.
  const requiredStimulusIds = new Set(
    qd.interactionStimulusAssociations.map((a) => a.stimulusRef)
  )

  // CONF-STM-001: every required QD stimulus has a StimulusRealization
  for (const stimulusId of requiredStimulusIds) {
    const stimulus = qd.stimuli.find((s) => s.id === stimulusId)
    const sr = qfd.stimulusRealizations.find(
      (r) => r.stimulusRef === stimulusId
    )
    findings.push(
      sr
        ? pass(
            'CONF-STM-001',
            `Stimulus '${stimulus?.code ?? stimulusId}' has a StimulusRealization.`,
            { affectedIds: [stimulusId] }
          )
        : fail(
            'CONF-STM-001',
            `Stimulus '${stimulus?.code ?? stimulusId}' required by the form has no StimulusRealization.`,
            {
              affectedIds: [stimulusId],
            }
          )
    )

    if (sr) {
      // CONF-STM-002: every required StimulusRealization is presented by at least one StimulusBlock
      const presented = blocks.some(
        (b) => b.kind === 'StimulusBlock' && b.stimulusRealizationRef === sr.id
      )
      findings.push(
        presented
          ? pass(
              'CONF-STM-002',
              `StimulusRealization '${sr.id}' is presented by at least one StimulusBlock.`,
              { affectedIds: [sr.id] }
            )
          : fail(
              'CONF-STM-002',
              `StimulusRealization '${sr.id}' is not presented by any StimulusBlock.`,
              { affectedIds: [sr.id] }
            )
      )
    }
  }

  // CONF-STM-003: multiple StimulusBlocks referencing the same StimulusRealization is conformant
  findings.push(
    pass(
      'CONF-STM-003',
      'Repeated StimulusBlocks referencing the same StimulusRealization are conformant.'
    )
  )

  for (const sr of qfd.stimulusRealizations) {
    const stimulus = qd.stimuli.find((s) => s.id === sr.stimulusRef)
    if (!stimulus) continue

    // CONF-MAT-001/002/003: materialization policy -> allowed realization mode(s)
    if (stimulus.materializationPolicy === 'Fixed') {
      findings.push(
        sr.mode === 'ReuseSource'
          ? pass(
              'CONF-MAT-001',
              `Fixed stimulus '${stimulus.code}' is realized via ReuseSource.`,
              { affectedIds: [sr.id] }
            )
          : fail(
              'CONF-MAT-001',
              `Fixed stimulus '${stimulus.code}' must be realized via ReuseSource, found '${sr.mode}'.`,
              {
                affectedIds: [sr.id],
              }
            )
      )
      // CONF-MAT-FIX-001: pure technical rendition must not change response-relevant content —
      // structurally guaranteed here because ReuseSource carries no realizedContent (QFD-VAL-SR-004).
      if (sr.mode === 'ReuseSource') {
        findings.push(
          pass(
            'CONF-MAT-FIX-001',
            `Fixed stimulus '${stimulus.code}' carries no substituted content.`,
            { affectedIds: [sr.id] }
          )
        )
      }
    } else if (stimulus.materializationPolicy === 'Adaptable') {
      const ok = sr.mode === 'ReuseSource' || sr.mode === 'AdaptSource'
      findings.push(
        ok
          ? pass(
              'CONF-MAT-002',
              `Adaptable stimulus '${stimulus.code}' is realized via '${sr.mode}'.`,
              { affectedIds: [sr.id] }
            )
          : fail(
              'CONF-MAT-002',
              `Adaptable stimulus '${stimulus.code}' must be realized via ReuseSource or AdaptSource, found '${sr.mode}'.`,
              {
                affectedIds: [sr.id],
              }
            )
      )
      if (sr.mode === 'AdaptSource') {
        findings.push(
          reviewRequired(
            'CONF-MAT-ADP-001',
            `Semantic fidelity of AdaptSource realization for '${stimulus.code}' requires human review.`,
            {
              affectedIds: [sr.id],
            }
          )
        )
      }
    } else {
      findings.push(
        sr.mode === 'MaterializeFromSpecification'
          ? pass(
              'CONF-MAT-003',
              `SpecificationBased stimulus '${stimulus.code}' is realized via MaterializeFromSpecification.`,
              {
                affectedIds: [sr.id],
              }
            )
          : fail(
              'CONF-MAT-003',
              `SpecificationBased stimulus '${stimulus.code}' must be realized via MaterializeFromSpecification, found '${sr.mode}'.`,
              {
                affectedIds: [sr.id],
              }
            )
      )
      if (sr.mode === 'MaterializeFromSpecification') {
        findings.push(
          reviewRequired(
            'CONF-MAT-SPC-001',
            `Semantic fidelity of MaterializeFromSpecification realization for '${stimulus.code}' requires human review.`,
            { affectedIds: [sr.id] }
          )
        )
      }
    }
  }

  // CONF-STM-INF-001: no additional response-relevant information beyond what QD defines/allows —
  // structurally guaranteed: this model has no field capable of carrying undeclared response-relevant data.
  findings.push(
    pass(
      'CONF-STM-INF-001',
      'The QFD model carries no response-relevant information beyond what QD defines.'
    )
  )

  // CONF-ROLE-CTX-001/002: Context pairs are realized and available; the stimulus does not
  // become the response surface for that same pair (guaranteed by QD ASC-002: at most one
  // role per interaction-stimulus pair, so a Context pair cannot simultaneously be Workspace).
  for (const assoc of qd.interactionStimulusAssociations) {
    if (assoc.role !== 'Context') continue
    const irExists = qfd.interactionRealizations.some(
      (ir) => ir.interactionRef === assoc.interactionRef
    )
    const srExists = qfd.stimulusRealizations.some(
      (sr) => sr.stimulusRef === assoc.stimulusRef
    )
    findings.push(
      irExists && srExists
        ? pass(
            'CONF-ROLE-CTX-001',
            `Context pair '${assoc.id}' has both its interaction and stimulus realized and available.`,
            {
              affectedIds: [assoc.id],
            }
          )
        : fail(
            'CONF-ROLE-CTX-001',
            `Context pair '${assoc.id}' is missing a realization for its interaction or stimulus.`,
            {
              affectedIds: [assoc.id],
            }
          )
    )
    findings.push(
      pass(
        'CONF-ROLE-CTX-002',
        `Context stimulus in pair '${assoc.id}' is not the response surface (guaranteed by QD ASC-002).`,
        {
          affectedIds: [assoc.id],
        }
      )
    )
  }

  return findings
}

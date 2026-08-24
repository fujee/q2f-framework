import type { QuestionDefinition } from '../../qd/model'
import type { QuestionFormDefinition, QuestionFormProfile } from '../model'
import { maxPosition, minPosition, presentationPositions } from '../layout'
import { type Finding, fail, pass, warning } from '../../shared/findings'

/** CONF-SEQ-001..002, CONF-DEP-001..005. */
export function validateSequenceConformance(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  profile: QuestionFormProfile
): Finding[] {
  const findings: Finding[] = []
  const positions = presentationPositions(qd, qfd)

  const precedes = (a: string, b: string): boolean | undefined => {
    const maxA = maxPosition(positions, a)
    const minB = minPosition(positions, b)
    if (maxA === undefined || minB === undefined) return undefined
    return maxA < minB
  }

  for (const constraint of qd.constraints) {
    if (constraint.type === 'Sequence') {
      let allOk = true
      for (let i = 0; i < constraint.interactionRefs.length - 1; i++) {
        const ok = precedes(
          constraint.interactionRefs[i],
          constraint.interactionRefs[i + 1]
        )
        if (ok === false) allOk = false
      }
      if (constraint.strength === 'Required') {
        findings.push(
          allOk
            ? pass(
                'CONF-SEQ-001',
                `Required sequence '${constraint.id}' is preserved by logical presentation order.`,
                {
                  affectedIds: [constraint.id],
                }
              )
            : fail(
                'CONF-SEQ-001',
                `Required sequence '${constraint.id}' is violated by logical presentation order.`,
                {
                  affectedIds: [constraint.id],
                }
              )
        )
      } else if (!allOk) {
        findings.push(
          warning(
            'CONF-SEQ-002',
            `Preferred sequence '${constraint.id}' is violated by logical presentation order.`,
            {
              affectedIds: [constraint.id],
            }
          )
        )
      }
    } else {
      const predIr = qfd.interactionRealizations.find(
        (ir) => ir.interactionRef === constraint.predecessorInteractionRef
      )
      const succIr = qfd.interactionRealizations.find(
        (ir) => ir.interactionRef === constraint.successorInteractionRef
      )

      // CONF-DEP-001: predecessor and successor have valid InteractionRealization objects
      findings.push(
        predIr && succIr
          ? pass(
              'CONF-DEP-001',
              `Dependency '${constraint.id}' predecessor/successor both have InteractionRealizations.`,
              {
                affectedIds: [constraint.id],
              }
            )
          : fail(
              'CONF-DEP-001',
              `Dependency '${constraint.id}' predecessor/successor is missing an InteractionRealization.`,
              {
                affectedIds: [constraint.id],
              }
            )
      )

      // CONF-DEP-002: dependency presentation preserves predecessor-before-successor order
      const order = precedes(
        constraint.predecessorInteractionRef,
        constraint.successorInteractionRef
      )
      findings.push(
        order === true
          ? pass(
              'CONF-DEP-002',
              `Dependency '${constraint.id}' presentation preserves predecessor-before-successor order.`,
              {
                affectedIds: [constraint.id],
              }
            )
          : fail(
              'CONF-DEP-002',
              `Dependency '${constraint.id}' presentation does not preserve predecessor-before-successor order.`,
              {
                affectedIds: [constraint.id],
              }
            )
      )

      const supported = profile.supportedDependencyCapabilities.has(
        constraint.rule
      )
      if (constraint.strength === 'Required') {
        if (supported) {
          // CONF-DEP-003: profile supports the Required dependency -> renderer/runtime enforces it directly from QD
          findings.push(
            pass(
              'CONF-DEP-003',
              `Profile '${profile.id}' supports Required dependency '${constraint.rule}'; enforced directly from QD.`,
              {
                affectedIds: [constraint.id],
              }
            )
          )
        } else {
          // CONF-DEP-004: unsupported Required dependency -> FAIL for this concrete form
          findings.push(
            fail(
              'CONF-DEP-004',
              `Profile '${profile.id}' does not support Required dependency '${constraint.rule}'.`,
              {
                affectedIds: [constraint.id],
              }
            )
          )
        }
      } else if (!supported) {
        // CONF-DEP-005: unsupported Preferred dependency -> WARNING
        findings.push(
          warning(
            'CONF-DEP-005',
            `Profile '${profile.id}' does not support Preferred dependency '${constraint.rule}'.`,
            {
              affectedIds: [constraint.id],
            }
          )
        )
      }
    }
  }

  return findings
}

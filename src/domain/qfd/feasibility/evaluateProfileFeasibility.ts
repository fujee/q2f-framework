import type { QuestionDefinition } from '../../qd/model'
import type { QuestionFormDefinition, QuestionFormProfile } from '../model'
import { MECHANISM_DESCRIPTORS } from '../mechanisms/registry'
import { collectUsedLayoutCapabilities } from '../layout'
import {
  aggregateFeasibility,
  type Finding,
  type FeasibilityAggregate,
  fail,
  pass,
  warning,
} from '../../shared/findings'

export interface FeasibilityResult {
  findings: Finding[]
  aggregate: FeasibilityAggregate
}

/** Evaluates profile feasibility for a *concrete* QD + QFD + profile tuple
 * (rules catalog Section 5). Not the same as the planning question "could this
 * profile potentially realize this QD?". */
export function evaluateProfileFeasibility(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition,
  profile: QuestionFormProfile
): FeasibilityResult {
  const findings: Finding[] = []

  // PROF-INT-001: every selected mechanism is supported by the profile
  for (const ir of qfd.interactionRealizations) {
    findings.push(
      profile.supportedResponseMechanisms.has(ir.mechanism)
        ? pass(
            'PROF-INT-001',
            `Mechanism '${ir.mechanism}' is supported by profile '${profile.id}'.`,
            { affectedIds: [ir.id] }
          )
        : fail(
            'PROF-INT-001',
            `Mechanism '${ir.mechanism}' is not supported by profile '${profile.id}'.`,
            { affectedIds: [ir.id] }
          )
    )
  }

  // PROF-STM-001: profile supports the modality of every stimulus required (realized) by the form
  for (const sr of qfd.stimulusRealizations) {
    const stimulus = qd.stimuli.find((s) => s.id === sr.stimulusRef)
    if (!stimulus) continue
    findings.push(
      profile.supportedStimulusTypes.has(stimulus.type)
        ? pass(
            'PROF-STM-001',
            `Stimulus modality '${stimulus.type}' is supported by profile '${profile.id}'.`,
            { affectedIds: [sr.id] }
          )
        : fail(
            'PROF-STM-001',
            `Stimulus modality '${stimulus.type}' is not supported by profile '${profile.id}'.`,
            { affectedIds: [sr.id] }
          )
    )
  }

  // PROF-LAY-001: every layout capability used by the QFD is supported by the profile
  const usedCapabilities = collectUsedLayoutCapabilities(qfd.rootLayout)
  for (const capability of usedCapabilities) {
    findings.push(
      profile.supportedLayoutCapabilities.has(capability)
        ? pass(
            'PROF-LAY-001',
            `Layout capability '${capability}' is supported by profile '${profile.id}'.`
          )
        : fail(
            'PROF-LAY-001',
            `Layout capability '${capability}' is not supported by profile '${profile.id}'.`
          )
    )
  }

  // PROF-ROLE-001 / PROF-PLAC-001: Workspace associations have a supported
  // integrated mechanism/layout realization in this concrete QFD/profile combination.
  for (const assoc of qd.interactionStimulusAssociations) {
    if (assoc.role !== 'Workspace') continue
    const ir = qfd.interactionRealizations.find(
      (r) => r.interactionRef === assoc.interactionRef
    )
    if (!ir) continue // reported by conformance (every QD interaction must have an IR)
    const descriptor = MECHANISM_DESCRIPTORS[ir.mechanism]
    const mechanismSupported = profile.supportedResponseMechanisms.has(
      ir.mechanism
    )
    const layoutSupported = [...descriptor.requiredLayoutCapabilities].some(
      (c) => profile.supportedLayoutCapabilities.has(c)
    )
    findings.push(
      mechanismSupported && layoutSupported
        ? pass(
            'PROF-ROLE-001',
            `Workspace association for '${assoc.interactionRef}' has a supported integrated realization.`,
            {
              affectedIds: [assoc.id],
            }
          )
        : fail(
            'PROF-ROLE-001',
            `Workspace association for '${assoc.interactionRef}' has no supported integrated mechanism/layout realization.`,
            {
              affectedIds: [assoc.id],
            }
          )
    )

    if (descriptor.requiresElementLevelPlacement) {
      findings.push(
        layoutSupported
          ? pass(
              'PROF-PLAC-001',
              `Profile '${profile.id}' supports the layout capability required for element-level placement.`,
              {
                affectedIds: [assoc.id],
              }
            )
          : fail(
              'PROF-PLAC-001',
              `Profile '${profile.id}' does not support the layout capability required for element-level placement.`,
              {
                affectedIds: [assoc.id],
              }
            )
      )
    }
  }

  // PROF-SEQ-001: required sequence can always be represented by deterministic
  // logical presentation order — guaranteed by construction (Stack/Grid/Canvas/
  // Inline traversal order is always well-defined).
  findings.push(
    pass(
      'PROF-SEQ-001',
      'Logical presentation order is deterministic by construction.'
    )
  )

  // PROF-DEP-001 / PROF-DEP-002 / PROF-DEP-003: dependency capability support
  for (const constraint of qd.constraints) {
    if (constraint.type !== 'Dependency') continue
    const supported = profile.supportedDependencyCapabilities.has(
      constraint.rule
    )
    const ruleId =
      constraint.rule === 'RequiresCompletion' ? 'PROF-DEP-001' : 'PROF-DEP-002'
    if (constraint.strength === 'Required') {
      findings.push(
        supported
          ? pass(
              ruleId,
              `Profile '${profile.id}' supports required dependency capability '${constraint.rule}'.`,
              {
                affectedIds: [constraint.id],
              }
            )
          : fail(
              ruleId,
              `Profile '${profile.id}' does not support required dependency capability '${constraint.rule}'.`,
              {
                affectedIds: [constraint.id],
              }
            )
      )
    } else if (!supported) {
      findings.push(
        warning(
          'PROF-DEP-003',
          `Profile '${profile.id}' does not support preferred dependency capability '${constraint.rule}'.`,
          {
            affectedIds: [constraint.id],
          }
        )
      )
    }
  }

  return { findings, aggregate: aggregateFeasibility(findings) }
}

import { hasConcreteContent } from '../../../qd/implementation/contentCarrier'
import type { ResponseInteractionType } from '../../../qd/model'
import { hasCycle, type DirectedEdge } from '../../../qd/validation/utils/graph'
import { fail, pass, type Finding } from '../../../shared/findings'
import type {
  DependencyRealization,
  InteractionRealization,
  QuestionFormDefinition,
} from '../../model'
import type { QfdValidationContext } from '../context'

const REALIZATION_TYPE: Record<
  ResponseInteractionType,
  InteractionRealization['type']
> = {
  Selecting: 'SelectingRealization',
  Ordering: 'OrderingRealization',
  Relating: 'RelatingRealization',
  Completing: 'CompletingRealization',
  ShortInput: 'ShortInputRealization',
  Essay: 'EssayRealization',
  ArtifactSubmission: 'ArtifactSubmissionRealization',
  Marking: 'MarkingRealization',
}

export function validateRootAndCoverage(
  qfd: QuestionFormDefinition,
  context: QfdValidationContext
): Finding[] {
  const findings: Finding[] = []
  findings.push(
    qfd.questionDefinitionRef === context.qd.id &&
      qfd.targetProfileRef === context.profile.id &&
      Boolean(qfd.rootLayout)
      ? pass('QFD-ROOT-001', 'QFD root references and rootLayout are present.')
      : fail(
          'QFD-ROOT-001',
          'QFD must reference the supplied QD/profile and declare rootLayout.'
        )
  )

  const duplicateRefs = [...context.realizationsByInteraction.entries()].filter(
    ([, realizations]) => realizations.length > 1
  )
  findings.push(
    duplicateRefs.length === 0
      ? pass('QFD-IR-001', 'Interaction realization references are unique.')
      : fail(
          'QFD-IR-001',
          'No two InteractionRealizations may share interactionRef.',
          {
            path: 'interactionRealizations',
            affectedIds: duplicateRefs.map(([id]) => id),
          }
        )
  )

  let coverageValid = qfd.interactionRealizations.length > 0
  for (const interaction of context.qd.responseInteractions) {
    const realizations =
      context.realizationsByInteraction.get(interaction.id) ?? []
    if (
      realizations.length !== 1 ||
      realizations[0].type !== REALIZATION_TYPE[interaction.type]
    )
      coverageValid = false
  }
  for (const realization of qfd.interactionRealizations) {
    const interaction = context.interactionsById.get(realization.interactionRef)
    if (!interaction || realization.type !== REALIZATION_TYPE[interaction.type])
      coverageValid = false
  }
  findings.push(
    coverageValid
      ? pass(
          'QFD-IR-002',
          'Every QD interaction has one type-compatible realization.'
        )
      : fail(
          'QFD-IR-002',
          'Every QD interaction requires exactly one type-compatible realization.',
          { path: 'interactionRealizations' }
        )
  )

  for (const realization of qfd.interactionRealizations) {
    const taskCount = realization.instructionRealizations.filter(
      ({ role }) => role === 'TaskInstruction'
    ).length
    const guidanceValid = realization.instructionRealizations
      .filter(({ role }) => role === 'OperationalGuidance')
      .every(({ realizedText }) => Boolean(realizedText?.trim()))
    const ids = realization.instructionRealizations.map(({ id }) => id)
    const rolesValid = realization.instructionRealizations.every(
      ({ role }) => role === 'TaskInstruction' || role === 'OperationalGuidance'
    )
    findings.push(
      taskCount <= 1 &&
        guidanceValid &&
        rolesValid &&
        ids.every((id) => id.trim().length > 0) &&
        new Set(ids).size === ids.length
        ? pass('QFD-INST-001', 'Instruction realization structure is valid.')
        : fail(
            'QFD-INST-001',
            'An interaction permits at most one TaskInstruction; guidance needs non-empty text and ids must be locally unique.',
            {
              path: `interactionRealizations[${realization.interactionRef}].instructionRealizations`,
            }
          )
    )
  }
  return findings
}

export function validateStimulusRealizations(
  qfd: QuestionFormDefinition,
  context: QfdValidationContext
): Finding[] {
  const findings: Finding[] = []
  const duplicateIds = [...context.stimulusRealizationsById.entries()].filter(
    ([, realizations]) => realizations.length > 1
  )
  findings.push(
    duplicateIds.length === 0
      ? pass('QFD-SR-001', 'StimulusRealization ids are unambiguous.')
      : fail(
          'QFD-SR-001',
          'StimulusRealization ids must be QFD-locally unique.',
          {
            path: 'stimulusRealizations',
            affectedIds: duplicateIds.map(([id]) => id),
          }
        )
  )

  for (const [index, realization] of qfd.stimulusRealizations.entries()) {
    const servedUnique =
      realization.id.trim().length > 0 &&
      realization.servedInteractionRefs.length > 0 &&
      new Set(realization.servedInteractionRefs).size ===
        realization.servedInteractionRefs.length
    const refsValid =
      context.stimulusIds.has(realization.stimulusRef) &&
      realization.servedInteractionRefs.every(
        (interactionRef) =>
          context.interactionsById.has(interactionRef) &&
          context.associationPairs.has(
            `${interactionRef}::${realization.stimulusRef}`
          )
      )
    const contentValid =
      realization.mode === 'PreserveContent' ||
      hasConcreteContent(realization.realizedContent)
    const intrinsicValuesValid =
      [
        'PreserveContent',
        'AdaptContent',
        'MaterializeFromSpecification',
      ].includes(realization.mode) &&
      ['Text', 'Image', 'Audio', 'Video'].includes(realization.realizedModality)
    findings.push(
      servedUnique && refsValid && contentValid && intrinsicValuesValid
        ? pass(
            'QFD-SR-002',
            `StimulusRealization '${realization.id}' is structurally valid.`
          )
        : fail(
            'QFD-SR-002',
            'StimulusRealization requires valid served association pairs and intrinsic mode/content cardinality.',
            {
              path: `stimulusRealizations[${index}]`,
              affectedIds: [realization.id],
            }
          )
    )
  }

  const uncovered = context.qd.associations.filter(
    (association) =>
      !qfd.stimulusRealizations.some(
        (realization) =>
          realization.stimulusRef === association.stimulusRef &&
          realization.servedInteractionRefs.includes(association.interactionRef)
      )
  )
  findings.push(
    uncovered.length === 0
      ? pass(
          'QFD-SR-003',
          'Every QD association is covered by a StimulusRealization.'
        )
      : fail(
          'QFD-SR-003',
          'Every QD association requires StimulusRealization coverage.',
          {
            path: 'stimulusRealizations',
          }
        )
  )
  return findings
}

export function validatePrecedenceAndDependencies(
  qfd: QuestionFormDefinition,
  context: QfdValidationContext
): Finding[] {
  const findings: Finding[] = []
  const precedencePairs = qfd.interactionPrecedences.map(
    ({ beforeInteractionRef, afterInteractionRef }) =>
      `${beforeInteractionRef}::${afterInteractionRef}`
  )
  const precedenceRefsValid = qfd.interactionPrecedences.every(
    ({ beforeInteractionRef, afterInteractionRef }) =>
      beforeInteractionRef !== afterInteractionRef &&
      context.interactionsById.has(beforeInteractionRef) &&
      context.interactionsById.has(afterInteractionRef)
  )
  const precedenceEdges: DirectedEdge[] = qfd.interactionPrecedences.map(
    ({ beforeInteractionRef, afterInteractionRef }) => ({
      from: beforeInteractionRef,
      to: afterInteractionRef,
    })
  )
  const precedenceValid =
    precedenceRefsValid &&
    new Set(precedencePairs).size === precedencePairs.length &&
    !hasCycle([...context.interactionsById.keys()], precedenceEdges)
  findings.push(
    precedenceValid
      ? pass(
          'QFD-PREC-001',
          'InteractionPrecedence is a valid acyclic partial order.'
        )
      : fail(
          'QFD-PREC-001',
          'InteractionPrecedence refs must resolve, be distinct/unique, and form an acyclic graph.',
          { path: 'interactionPrecedences' }
        )
  )

  const dependencyKeys = qfd.dependencyRealizations.map(dependencyKey)
  const dependenciesValid =
    new Set(dependencyKeys).size === dependencyKeys.length &&
    qfd.dependencyRealizations.every(
      (dependency) =>
        dependency.predecessorInteractionRef !==
          dependency.successorInteractionRef &&
        context.interactionsById.has(dependency.predecessorInteractionRef) &&
        context.interactionsById.has(dependency.successorInteractionRef) &&
        ['RequiresCompletion', 'RequiresCorrectness'].includes(
          dependency.rule
        ) &&
        ['Unrestricted', 'ConcealedUntilSatisfied'].includes(
          dependency.exposurePolicy
        )
    )
  findings.push(
    dependenciesValid
      ? pass(
          'QFD-DEP-001',
          'DependencyRealizations are structurally canonical.'
        )
      : fail(
          'QFD-DEP-001',
          'DependencyRealizations require valid distinct refs/enums and no exact duplicates.',
          { path: 'dependencyRealizations' }
        )
  )
  return findings
}

function dependencyKey(dependency: DependencyRealization): string {
  return [
    dependency.predecessorInteractionRef,
    dependency.successorInteractionRef,
    dependency.rule,
    dependency.exposurePolicy,
  ].join('::')
}

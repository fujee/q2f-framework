import type {
  Completing,
  ResponseInteraction,
  TypedValue,
} from '@/domain/qd/model'
import type { InteractionRealization } from '@/domain/qfd/model'
import {
  CanonicalResponseRejection,
  normalizeArtifactSubmissionResponse,
  normalizeCompletingResponse,
  normalizeEssayResponse,
  normalizeOrderingResponse,
  normalizeRelatingResponse,
  normalizeSelectingResponse,
  normalizeShortInputResponse,
  type CanonicalGapResponse,
  type CanonicalRelation,
} from '@/domain/evaluation/canonicalResponse'

export interface RendererResponseAcceptance {
  /** Marking remains implementation-specific; no generic mark payload is implied. */
  acceptMarking?: (
    interaction: Extract<ResponseInteraction, { type: 'Marking' }>,
    raw: unknown
  ) => boolean
}

type AcceptedResponse =
  | { kind: 'Selecting'; value: ReadonlySet<string> }
  | { kind: 'Ordering'; value: readonly string[] }
  | { kind: 'Relating'; value: ReadonlySet<CanonicalRelation> }
  | {
      kind: 'Completing'
      value: ReadonlyMap<string, CanonicalGapResponse>
    }
  | { kind: 'ShortInput'; value: TypedValue }
  | { kind: 'Essay'; value: string }
  | { kind: 'ArtifactSubmission' }
  | { kind: 'Marking' }

function asStringArray(raw: unknown): unknown {
  return raw
}

function acceptResponse(
  interaction: ResponseInteraction,
  realization: InteractionRealization,
  raw: unknown,
  acceptance: RendererResponseAcceptance = {}
): AcceptedResponse | undefined {
  if (raw === undefined || raw === null) return undefined
  try {
    switch (interaction.type) {
      case 'Selecting': {
        if (realization.type !== 'SelectingRealization') return undefined
        const standaloneMode = realization.standaloneSelection?.mode
        if (standaloneMode) {
          return {
            kind: 'Selecting',
            value: normalizeSelectingResponse(interaction, {
              technique: standaloneMode,
              selectedChoiceRefs: asStringArray(raw),
            }),
          }
        }
        const referencedOnly =
          realization.workspaceRealizations.length > 0 &&
          realization.workspaceRealizations.every(
            ({ mode }) => mode === 'ReferencedSelection'
          )
        if (referencedOnly) {
          const mappings = interaction.choices.map(({ id }) => ({
            rawRef: id,
            semanticRef: id,
          }))
          return {
            kind: 'Selecting',
            value: normalizeSelectingResponse(interaction, {
              technique: 'ReferencedSelection',
              selectedRawRefs: asStringArray(raw),
              mappings,
            }),
          }
        }
        return {
          kind: 'Selecting',
          value: normalizeSelectingResponse(interaction, {
            technique: 'DirectSelection',
            selectedChoiceRefs: asStringArray(raw),
          }),
        }
      }
      case 'Ordering': {
        if (realization.type !== 'OrderingRealization') return undefined
        return {
          kind: 'Ordering',
          value:
            realization.mode === 'DirectOrdering'
              ? normalizeOrderingResponse(interaction, {
                  technique: 'DirectOrdering',
                  orderedItemRefs: raw,
                })
              : normalizeOrderingResponse(interaction, {
                  technique: 'OrderNotation',
                  rankedItems: Array.isArray(raw)
                    ? raw.map((itemRef, index) => ({
                        itemRef,
                        rank: index + 1,
                      }))
                    : raw,
                }),
        }
      }
      case 'Relating': {
        if (realization.type !== 'RelatingRealization') return undefined
        const pairs = raw
        if (realization.mode === 'DirectRelationConstruction') {
          return {
            kind: 'Relating',
            value: normalizeRelatingResponse(interaction, {
              technique: 'DirectRelationConstruction',
              pairs,
            }),
          }
        }
        return {
          kind: 'Relating',
          value: normalizeRelatingResponse(interaction, {
            technique: 'RelationNotation',
            pairs,
            sourceMappings: interaction.sourceSet.relatingElements.map(
              ({ id }) => ({ rawRef: id, semanticRef: id })
            ),
            targetMappings: interaction.targetSet.relatingElements.map(
              ({ id }) => ({ rawRef: id, semanticRef: id })
            ),
          }),
        }
      }
      case 'Completing': {
        if (
          realization.type !== 'CompletingRealization' ||
          typeof raw !== 'object' ||
          raw === null ||
          Array.isArray(raw)
        )
          return undefined
        const record = raw as Record<string, unknown>
        const responses = Object.entries(record).map(([gapRef, value]) => {
          const gap = interaction.completingGaps.find(({ id }) => id === gapRef)
          return {
            gapRef,
            response:
              gap?.type === 'InputGap'
                ? ({ kind: 'Scalar', value } as const)
                : ({ kind: 'ItemRef', itemRef: value } as const),
          }
        })
        const hasDirectPlacement = realization.gapRealizations.some(
          (gap) =>
            gap.type === 'ItemGapRealization' &&
            gap.assignmentMode === 'DirectPlacement'
        )
        const hasItemSelection = realization.gapRealizations.some(
          (gap) =>
            gap.type === 'ItemGapRealization' &&
            gap.assignmentMode === 'ItemSelection'
        )
        return {
          kind: 'Completing',
          value: normalizeCompletingResponse(interaction, {
            technique: hasDirectPlacement
              ? 'DirectPlacement'
              : hasItemSelection
                ? 'ItemSelection'
                : 'EmbeddedInput',
            responses,
          }),
        }
      }
      case 'ShortInput':
        if (realization.type !== 'ShortInputRealization') return undefined
        return {
          kind: 'ShortInput',
          value: normalizeShortInputResponse(interaction, raw),
        }
      case 'Essay':
        if (realization.type !== 'EssayRealization') return undefined
        return {
          kind: 'Essay',
          value: normalizeEssayResponse(interaction, raw),
        }
      case 'ArtifactSubmission':
        if (realization.type !== 'ArtifactSubmissionRealization')
          return undefined
        normalizeArtifactSubmissionResponse(interaction, {
          channel: realization.submissionMode,
          artifactRefs: raw,
        })
        return { kind: 'ArtifactSubmission' }
      case 'Marking':
        if (
          realization.type !== 'MarkingRealization' ||
          !acceptance.acceptMarking?.(interaction, raw)
        )
          return undefined
        return { kind: 'Marking' }
    }
  } catch (error) {
    if (error instanceof CanonicalResponseRejection) return undefined
    throw error
  }
}

export function isResponseCompleted(
  interaction: ResponseInteraction,
  realization: InteractionRealization,
  raw: unknown,
  acceptance: RendererResponseAcceptance = {}
): boolean {
  return acceptResponse(interaction, realization, raw, acceptance) !== undefined
}

function setEquals<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  return (
    left.size === right.size && [...left].every((value) => right.has(value))
  )
}

function scalarEquals(
  actual: TypedValue,
  expected: TypedValue,
  caseSensitive = true
): boolean {
  if (typeof actual !== typeof expected) return false
  return typeof actual === 'string' && typeof expected === 'string'
    ? caseSensitive
      ? actual === expected
      : actual.toLocaleLowerCase() === expected.toLocaleLowerCase()
    : actual === expected
}

function completingCorrect(
  interaction: Completing,
  response: ReadonlyMap<string, CanonicalGapResponse>
): boolean {
  return interaction.completingGaps.every((gap) => {
    const actual = response.get(gap.id)
    if (!actual) return false
    if (gap.type === 'ItemGap') {
      return (
        actual.kind === 'ItemRef' &&
        gap.correctItemRefs.includes(actual.itemRef)
      )
    }
    return (
      actual.kind === 'InputValue' &&
      gap.correctValues.some((correct) =>
        scalarEquals(
          actual.value,
          correct,
          gap.inputType !== 'Text' || gap.caseSensitive === true
        )
      )
    )
  })
}

/** Formal correctness exists only for the five stabilized objective families. */
export function isInteractionCorrect(
  interaction: ResponseInteraction,
  realization: InteractionRealization,
  raw: unknown
): boolean {
  const accepted = acceptResponse(interaction, realization, raw)
  if (!accepted) return false
  switch (interaction.type) {
    case 'Selecting':
      if (accepted.kind !== 'Selecting') return false
      return setEquals(
        accepted.value,
        new Set(
          interaction.choices
            .filter(({ isCorrect }) => isCorrect)
            .map(({ id }) => id)
        )
      )
    case 'Ordering':
      return (
        accepted.kind === 'Ordering' &&
        accepted.value.length === interaction.correctOrder.length &&
        accepted.value.every(
          (itemRef, index) => itemRef === interaction.correctOrder[index]
        )
      )
    case 'Relating': {
      if (accepted.kind !== 'Relating') return false
      const actual = new Set(
        [...accepted.value].map(
          ({ sourceElementRef, targetElementRef }) =>
            `${JSON.stringify(sourceElementRef)}:${JSON.stringify(targetElementRef)}`
        )
      )
      const expected = new Set(
        interaction.correctRelations.map(
          ({ sourceElementRef, targetElementRef }) =>
            `${JSON.stringify(sourceElementRef)}:${JSON.stringify(targetElementRef)}`
        )
      )
      return setEquals(actual, expected)
    }
    case 'Completing':
      return (
        accepted.kind === 'Completing' &&
        completingCorrect(interaction, accepted.value)
      )
    case 'ShortInput':
      return (
        accepted.kind === 'ShortInput' &&
        interaction.correctValues.some((correct) =>
          scalarEquals(
            accepted.value,
            correct,
            interaction.inputType !== 'Text' ||
              interaction.caseSensitive === true
          )
        )
      )
    case 'Essay':
    case 'ArtifactSubmission':
    case 'Marking':
      return false
  }
}

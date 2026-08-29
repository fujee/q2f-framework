import type {
  ArtifactSubmission,
  Completing,
  CompletingGap,
  Essay,
  InputType,
  Marking,
  Ordering,
  Relating,
  ResponseInteraction,
  Selecting,
  ShortInput,
  TypedValue,
} from '../qd/model'

/**
 * Evaluation-level acceptance adapters for the canonical response contracts
 * frozen by Evaluation Protocol v2. These adapters consume controlled raw
 * realization output; they are not renderer events, persistence records,
 * scoring rules, or additions to the scientific QD model.
 */

export type CanonicalResponseRejectionCode =
  | 'MALFORMED_RAW_RESPONSE'
  | 'UNKNOWN_REFERENCE'
  | 'AMBIGUOUS_REFERENCE'
  | 'DUPLICATE_REFERENCE'
  | 'INCOMPLETE_RESPONSE'
  | 'CARDINALITY_VIOLATION'
  | 'TYPE_MISMATCH'
  | 'USAGE_LIMIT_EXCEEDED'

export class CanonicalResponseRejection extends Error {
  constructor(
    readonly code: CanonicalResponseRejectionCode,
    message: string
  ) {
    super(message)
    this.name = 'CanonicalResponseRejection'
  }
}

function reject(code: CanonicalResponseRejectionCode, message: string): never {
  throw new CanonicalResponseRejection(code, message)
}

function stringArray(raw: unknown, context: string): string[] {
  if (
    !Array.isArray(raw) ||
    !raw.every((value) => typeof value === 'string' && value.length > 0)
  ) {
    reject(
      'MALFORMED_RAW_RESPONSE',
      `${context} must be an array of non-empty identifiers.`
    )
  }
  return raw
}

function assertNoDuplicates(values: readonly string[], context: string): void {
  if (new Set(values).size !== values.length) {
    reject('DUPLICATE_REFERENCE', `${context} contains a duplicate identifier.`)
  }
}

function assertKnownRef(
  ref: string,
  allowedRefs: ReadonlySet<string>,
  context: string
): string {
  if (!allowedRefs.has(ref)) {
    reject(
      'UNKNOWN_REFERENCE',
      `${context} references unknown identifier '${ref}'.`
    )
  }
  return ref
}

export interface RawReferenceMapping {
  rawRef: string
  semanticRef: string
}

function referenceMappings(
  raw: unknown,
  context: string
): RawReferenceMapping[] {
  if (!Array.isArray(raw)) {
    reject('MALFORMED_RAW_RESPONSE', `${context} mappings must be an array.`)
  }
  return raw.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      typeof (candidate as Record<string, unknown>).rawRef !== 'string' ||
      typeof (candidate as Record<string, unknown>).semanticRef !== 'string'
    ) {
      reject(
        'MALFORMED_RAW_RESPONSE',
        `${context} mappings require rawRef and semanticRef strings.`
      )
    }
    return {
      rawRef: (candidate as RawReferenceMapping).rawRef,
      semanticRef: (candidate as RawReferenceMapping).semanticRef,
    }
  })
}

function resolveMappedRef(
  rawRef: string,
  rawMappings: unknown,
  allowedRefs: ReadonlySet<string>,
  context: string
): string {
  const matches = referenceMappings(rawMappings, context).filter(
    (mapping) => mapping.rawRef === rawRef
  )
  if (matches.length === 0) {
    reject(
      'UNKNOWN_REFERENCE',
      `${context} raw identifier '${rawRef}' has no semantic mapping.`
    )
  }
  const semanticRefs = new Set(matches.map(({ semanticRef }) => semanticRef))
  if (matches.length !== 1 || semanticRefs.size !== 1) {
    reject(
      'AMBIGUOUS_REFERENCE',
      `${context} raw identifier '${rawRef}' does not resolve uniquely.`
    )
  }
  return assertKnownRef(matches[0].semanticRef, allowedRefs, context)
}

export type SelectingRawResponse =
  | {
      technique: 'Collapsed' | 'Expanded' | 'DirectSelection'
      selectedChoiceRefs: unknown
    }
  | {
      technique: 'ReferencedSelection'
      selectedRawRefs: unknown
      mappings: unknown
    }

export function normalizeSelectingResponse(
  interaction: Selecting,
  raw: SelectingRawResponse
): ReadonlySet<string> {
  const allowedRefs = new Set(interaction.choices.map(({ id }) => id))
  const selected =
    raw.technique === 'ReferencedSelection'
      ? stringArray(raw.selectedRawRefs, raw.technique).map((rawRef) =>
          resolveMappedRef(rawRef, raw.mappings, allowedRefs, raw.technique)
        )
      : stringArray(raw.selectedChoiceRefs, raw.technique).map((choiceRef) =>
          assertKnownRef(choiceRef, allowedRefs, raw.technique)
        )

  assertNoDuplicates(selected, `${raw.technique} response`)
  if (
    selected.length < interaction.minSelections ||
    selected.length > interaction.maxSelections
  ) {
    reject(
      'CARDINALITY_VIOLATION',
      `Selecting response requires ${interaction.minSelections}..${interaction.maxSelections} choices.`
    )
  }
  return new Set([...selected].sort())
}

export type OrderingRawResponse =
  | { technique: 'DirectOrdering'; orderedItemRefs: unknown }
  | { technique: 'OrderNotation'; rankedItems: unknown }

interface RankedItem {
  itemRef: string
  rank: number
}

function rankedItems(raw: unknown): RankedItem[] {
  if (!Array.isArray(raw)) {
    reject('MALFORMED_RAW_RESPONSE', 'OrderNotation ranks must be an array.')
  }
  return raw.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      typeof (candidate as Record<string, unknown>).itemRef !== 'string' ||
      typeof (candidate as Record<string, unknown>).rank !== 'number'
    ) {
      reject(
        'MALFORMED_RAW_RESPONSE',
        'Each OrderNotation entry requires itemRef and numeric rank.'
      )
    }
    const entry = candidate as RankedItem
    if (!Number.isInteger(entry.rank) || entry.rank < 1) {
      reject(
        'MALFORMED_RAW_RESPONSE',
        'OrderNotation ranks must be positive integers.'
      )
    }
    return { itemRef: entry.itemRef, rank: entry.rank }
  })
}

export function normalizeOrderingResponse(
  interaction: Ordering,
  raw: OrderingRawResponse
): readonly string[] {
  const allowedRefs = new Set(interaction.orderingItems.map(({ id }) => id))
  let orderedRefs: string[]

  if (raw.technique === 'DirectOrdering') {
    orderedRefs = stringArray(raw.orderedItemRefs, raw.technique)
  } else {
    const entries = rankedItems(raw.rankedItems)
    const ranks = entries.map(({ rank }) => String(rank))
    assertNoDuplicates(ranks, 'OrderNotation ranks')
    orderedRefs = [...entries]
      .sort((left, right) => left.rank - right.rank)
      .map(({ itemRef }) => itemRef)
  }

  assertNoDuplicates(orderedRefs, `${raw.technique} item references`)
  for (const itemRef of orderedRefs) {
    assertKnownRef(itemRef, allowedRefs, raw.technique)
  }
  if (orderedRefs.length !== allowedRefs.size) {
    reject(
      'INCOMPLETE_RESPONSE',
      'Ordering response must contain every owning OrderingItem exactly once.'
    )
  }
  return orderedRefs
}

export interface CanonicalRelation {
  sourceElementRef: string
  targetElementRef: string
}

export type RelatingRawResponse =
  | { technique: 'DirectRelationConstruction'; pairs: unknown }
  | {
      technique: 'RelationNotation'
      pairs: unknown
      sourceMappings: unknown
      targetMappings: unknown
    }

function rawRelationPairs(raw: unknown, context: string): CanonicalRelation[] {
  if (!Array.isArray(raw)) {
    reject('MALFORMED_RAW_RESPONSE', `${context} pairs must be an array.`)
  }
  return raw.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      typeof (candidate as Record<string, unknown>).sourceElementRef !==
        'string' ||
      typeof (candidate as Record<string, unknown>).targetElementRef !==
        'string'
    ) {
      reject(
        'MALFORMED_RAW_RESPONSE',
        `${context} pairs require sourceElementRef and targetElementRef strings.`
      )
    }
    const pair = candidate as CanonicalRelation
    return {
      sourceElementRef: pair.sourceElementRef,
      targetElementRef: pair.targetElementRef,
    }
  })
}

function validateRelatingCardinality(
  interaction: Relating,
  pairs: readonly CanonicalRelation[]
): void {
  const sources = pairs.map(({ sourceElementRef }) => sourceElementRef)
  const targets = pairs.map(({ targetElementRef }) => targetElementRef)
  if (
    interaction.mappingType === 'OneToOne' ||
    interaction.mappingType === 'ManyToOne'
  ) {
    assertNoDuplicates(sources, `${interaction.mappingType} source references`)
  }
  if (
    interaction.mappingType === 'OneToOne' ||
    interaction.mappingType === 'OneToMany'
  ) {
    assertNoDuplicates(targets, `${interaction.mappingType} target references`)
  }
  if (
    interaction.sourceParticipationPolicy === 'Required' &&
    new Set(sources).size !== interaction.sourceSet.relatingElements.length
  ) {
    reject(
      'INCOMPLETE_RESPONSE',
      'Required Relating response must include every source element.'
    )
  }
}

export function normalizeRelatingResponse(
  interaction: Relating,
  raw: RelatingRawResponse
): ReadonlySet<CanonicalRelation> {
  const sourceRefs = new Set(
    interaction.sourceSet.relatingElements.map(({ id }) => id)
  )
  const targetRefs = new Set(
    interaction.targetSet.relatingElements.map(({ id }) => id)
  )
  const inputPairs = rawRelationPairs(raw.pairs, raw.technique)
  const pairs = inputPairs.map((pair) =>
    raw.technique === 'RelationNotation'
      ? {
          sourceElementRef: resolveMappedRef(
            pair.sourceElementRef,
            raw.sourceMappings,
            sourceRefs,
            'RelationNotation source namespace'
          ),
          targetElementRef: resolveMappedRef(
            pair.targetElementRef,
            raw.targetMappings,
            targetRefs,
            'RelationNotation target namespace'
          ),
        }
      : {
          sourceElementRef: assertKnownRef(
            pair.sourceElementRef,
            sourceRefs,
            'DirectRelationConstruction source namespace'
          ),
          targetElementRef: assertKnownRef(
            pair.targetElementRef,
            targetRefs,
            'DirectRelationConstruction target namespace'
          ),
        }
  )

  const pairKeys = pairs.map(
    ({ sourceElementRef, targetElementRef }) =>
      `${JSON.stringify(sourceElementRef)}:${JSON.stringify(targetElementRef)}`
  )
  assertNoDuplicates(pairKeys, `${raw.technique} relation pairs`)
  validateRelatingCardinality(interaction, pairs)

  return new Set(
    [...pairs].sort(
      (left, right) =>
        left.sourceElementRef.localeCompare(right.sourceElementRef) ||
        left.targetElementRef.localeCompare(right.targetElementRef)
    )
  )
}

export type CanonicalGapResponse =
  | { kind: 'InputValue'; value: TypedValue }
  | { kind: 'ItemRef'; itemRef: string }

export interface RawGapResponse {
  gapRef: string
  response:
    { kind: 'Scalar'; value: unknown } | { kind: 'ItemRef'; itemRef: unknown }
}

export interface CompletingRawResponse {
  technique: 'DirectPlacement' | 'ItemSelection' | 'EmbeddedInput'
  responses: unknown
}

function rawGapResponses(raw: unknown): RawGapResponse[] {
  if (!Array.isArray(raw)) {
    reject('MALFORMED_RAW_RESPONSE', 'Completing responses must be an array.')
  }
  return raw.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      typeof (candidate as Record<string, unknown>).gapRef !== 'string' ||
      typeof (candidate as Record<string, unknown>).response !== 'object' ||
      (candidate as Record<string, unknown>).response === null
    ) {
      reject(
        'MALFORMED_RAW_RESPONSE',
        'Each Completing entry requires gapRef and a typed response.'
      )
    }
    return candidate as RawGapResponse
  })
}

function compareTypedValues(left: TypedValue, right: TypedValue): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left).localeCompare(String(right))
}

function validateScalarBounds(
  value: TypedValue,
  owner: ShortInput | Extract<CompletingGap, { type: 'InputGap' }>
): void {
  if (
    owner.minValue !== undefined &&
    compareTypedValues(value, owner.minValue) < 0
  ) {
    reject('CARDINALITY_VIOLATION', 'Scalar value is below the QD minimum.')
  }
  if (
    owner.maxValue !== undefined &&
    compareTypedValues(value, owner.maxValue) > 0
  ) {
    reject('CARDINALITY_VIOLATION', 'Scalar value is above the QD maximum.')
  }
}

function parseDate(raw: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!match) reject('TYPE_MISMATCH', 'Date response must use YYYY-MM-DD.')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    reject('TYPE_MISMATCH', 'Date response is not a valid calendar date.')
  }
  return raw
}

export function normalizeTypedScalar(
  raw: unknown,
  inputType: InputType
): TypedValue {
  if (inputType === 'Text') {
    if (typeof raw !== 'string') {
      reject('TYPE_MISMATCH', 'Text response must be a string.')
    }
    return raw
  }
  if (inputType === 'Date') {
    if (typeof raw !== 'string') {
      reject('TYPE_MISMATCH', 'Date response must be a string.')
    }
    return parseDate(raw)
  }
  if (inputType === 'Integer') {
    if (typeof raw === 'number') {
      if (!Number.isSafeInteger(raw)) {
        reject('TYPE_MISMATCH', 'Integer response must be a safe integer.')
      }
      return raw
    }
    if (typeof raw !== 'string' || !/^-?(0|[1-9]\d*)$/.test(raw)) {
      reject('TYPE_MISMATCH', 'Integer response has an invalid lexical form.')
    }
    const value = Number(raw)
    if (!Number.isSafeInteger(value)) {
      reject('TYPE_MISMATCH', 'Integer response must be a safe integer.')
    }
    return value
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      reject('TYPE_MISMATCH', 'Number response must be finite.')
    }
    return raw
  }
  if (
    typeof raw !== 'string' ||
    !/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)
  ) {
    reject('TYPE_MISMATCH', 'Number response has an invalid lexical form.')
  }
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    reject('TYPE_MISMATCH', 'Number response must be finite.')
  }
  return value
}

export function normalizeCompletingResponse(
  interaction: Completing,
  raw: CompletingRawResponse
): ReadonlyMap<string, CanonicalGapResponse> {
  const gaps = new Map(interaction.completingGaps.map((gap) => [gap.id, gap]))
  const items = new Map(
    interaction.completingItems.map((item) => [item.id, item])
  )
  const entries = rawGapResponses(raw.responses)
  assertNoDuplicates(
    entries.map(({ gapRef }) => gapRef),
    `${raw.technique} gap references`
  )
  if (entries.length !== gaps.size) {
    reject(
      'INCOMPLETE_RESPONSE',
      'Completing response must contain every owning gap exactly once.'
    )
  }

  const canonical = new Map<string, CanonicalGapResponse>()
  const itemUsage = new Map<string, number>()
  for (const { gapRef, response } of entries) {
    const gap = gaps.get(gapRef)
    if (!gap) {
      reject(
        'UNKNOWN_REFERENCE',
        `Completing response references non-owning gap '${gapRef}'.`
      )
    }
    if (gap.type === 'InputGap') {
      if (response.kind !== 'Scalar') {
        reject(
          'TYPE_MISMATCH',
          `InputGap '${gapRef}' requires a scalar response.`
        )
      }
      const value = normalizeTypedScalar(response.value, gap.inputType)
      validateScalarBounds(value, gap)
      canonical.set(gapRef, { kind: 'InputValue', value })
      continue
    }
    if (response.kind !== 'ItemRef' || typeof response.itemRef !== 'string') {
      reject('TYPE_MISMATCH', `ItemGap '${gapRef}' requires an item reference.`)
    }
    const item = items.get(response.itemRef)
    if (!item) {
      reject(
        'UNKNOWN_REFERENCE',
        `ItemGap '${gapRef}' references non-owning item '${response.itemRef}'.`
      )
    }
    const usage = (itemUsage.get(item.id) ?? 0) + 1
    if (item.usageLimit !== undefined && usage > item.usageLimit) {
      reject(
        'USAGE_LIMIT_EXCEEDED',
        `Completing item '${item.id}' exceeds its global usageLimit.`
      )
    }
    itemUsage.set(item.id, usage)
    canonical.set(gapRef, { kind: 'ItemRef', itemRef: item.id })
  }
  return canonical
}

export function normalizeShortInputResponse(
  interaction: ShortInput,
  raw: unknown
): TypedValue {
  const value = normalizeTypedScalar(raw, interaction.inputType)
  validateScalarBounds(value, interaction)
  return value
}

export function normalizeEssayResponse(
  interaction: Essay,
  raw: unknown
): string {
  if (typeof raw !== 'string') {
    reject('TYPE_MISMATCH', 'Essay response must be text.')
  }
  const length =
    interaction.lengthUnit === 'Words'
      ? raw.trim().length === 0
        ? 0
        : raw.trim().split(/\s+/u).length
      : [...raw].length
  if (interaction.minLength !== undefined && length < interaction.minLength) {
    reject(
      'CARDINALITY_VIOLATION',
      'Essay response is below the QD minimum length.'
    )
  }
  if (interaction.maxLength !== undefined && length > interaction.maxLength) {
    reject(
      'CARDINALITY_VIOLATION',
      'Essay response exceeds the QD maximum length.'
    )
  }
  return raw
}

/** Technical identity only; no storage, MIME, or channel semantics are added. */
export interface CanonicalArtifact {
  artifactRef: string
}

export interface ArtifactSubmissionRawResponse {
  channel: 'DigitalSubmission' | 'PhysicalSubmission'
  artifactRefs: unknown
}

export function normalizeArtifactSubmissionResponse(
  interaction: ArtifactSubmission,
  raw: ArtifactSubmissionRawResponse
): readonly CanonicalArtifact[] {
  const artifactRefs = stringArray(raw.artifactRefs, raw.channel)
  assertNoDuplicates(artifactRefs, `${raw.channel} artifact references`)
  if (
    artifactRefs.length < interaction.minArtifacts ||
    (interaction.maxArtifacts !== undefined &&
      artifactRefs.length > interaction.maxArtifacts)
  ) {
    reject(
      'CARDINALITY_VIOLATION',
      'Artifact response violates the QD artifact cardinality.'
    )
  }
  return [...artifactRefs].sort().map((artifactRef) => ({ artifactRef }))
}

export type CanonicalNormalizationSupport =
  { status: 'SUPPORTED' } | { status: 'RENDERER_SPECIFIC'; reason: string }

export function describeCanonicalNormalizationSupport(
  interaction: ResponseInteraction
): CanonicalNormalizationSupport {
  if (interaction.type !== 'Marking') return { status: 'SUPPORTED' }
  return markingNormalizationBoundary(interaction)
}

function markingNormalizationBoundary(
  interaction: Marking
): CanonicalNormalizationSupport {
  return {
    status: 'RENDERER_SPECIFIC',
    reason:
      `Marking '${interaction.id}' has the stabilized ${interaction.markType} response kind, ` +
      'but the frozen QD baseline intentionally defines no universal raw mark payload, geometry, or coordinate schema.',
  }
}

/**
 * Canonical response normalization (QFD plan Section 4 canonical response principle;
 * rules catalog Section 7 normalization table). Every mechanism response must
 * normalize unambiguously into the canonical QD response of its owning interaction.
 * Malformed input is rejected explicitly — normalization never guesses.
 */

export class NormalizationError extends Error {}

function assertStringArray(value: unknown, context: string): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new NormalizationError(`${context}: expected an array of strings.`)
  }
  return value
}

// --- Selecting ---------------------------------------------------------------

export function normalizeListSelection(raw: unknown): Set<string> {
  return new Set(assertStringArray(raw, 'ListSelection'))
}

export function normalizeSpatialSelection(raw: unknown): Set<string> {
  return new Set(assertStringArray(raw, 'SpatialSelection'))
}

// --- Ordering ------------------------------------------------------------------

export function normalizeDirectOrdering(raw: unknown): string[] {
  return assertStringArray(raw, 'DirectOrdering')
}

export function normalizeOrderNotation(raw: unknown): string[] {
  if (typeof raw !== 'object' || raw === null) {
    throw new NormalizationError(
      'OrderNotation: expected an object mapping item ref to rank.'
    )
  }
  const entries = Object.entries(raw as Record<string, unknown>)
  for (const [, rank] of entries) {
    if (typeof rank !== 'number')
      throw new NormalizationError(
        'OrderNotation: rank values must be numbers.'
      )
  }
  return entries
    .sort((a, b) => (a[1] as number) - (b[1] as number))
    .map(([ref]) => ref)
}

// --- Relating --------------------------------------------------------------------

export interface SourceTargetPair {
  sourceElementRef: string
  targetElementRef: string
}

function pairKey(p: SourceTargetPair): string {
  return `${p.sourceElementRef}::${p.targetElementRef}`
}

export function normalizeDirectRelationConstruction(
  raw: unknown
): SourceTargetPair[] {
  if (!Array.isArray(raw))
    throw new NormalizationError(
      'DirectRelationConstruction: expected an array of pairs.'
    )
  const pairs = raw.map((p) => {
    if (
      typeof p !== 'object' ||
      p === null ||
      typeof (p as Record<string, unknown>).sourceElementRef !== 'string' ||
      typeof (p as Record<string, unknown>).targetElementRef !== 'string'
    ) {
      throw new NormalizationError(
        'DirectRelationConstruction: each pair must have sourceElementRef/targetElementRef strings.'
      )
    }
    const rec = p as Record<string, unknown>
    return {
      sourceElementRef: rec.sourceElementRef as string,
      targetElementRef: rec.targetElementRef as string,
    }
  })
  const seen = new Set<string>()
  const result: SourceTargetPair[] = []
  for (const p of pairs) {
    const k = pairKey(p)
    if (!seen.has(k)) {
      seen.add(k)
      result.push(p)
    }
  }
  return result
}

export function normalizeRelationNotation(raw: unknown): SourceTargetPair[] {
  if (typeof raw !== 'object' || raw === null) {
    throw new NormalizationError(
      'RelationNotation: expected an object mapping source ref to target ref.'
    )
  }
  return Object.entries(raw as Record<string, unknown>).map(
    ([source, target]) => {
      if (typeof target !== 'string')
        throw new NormalizationError(
          'RelationNotation: target values must be strings.'
        )
      return { sourceElementRef: source, targetElementRef: target }
    }
  )
}

// --- Completing ------------------------------------------------------------------

export type GapResponse = string | string[]

export function normalizeCompletion(raw: unknown): Map<string, GapResponse> {
  if (typeof raw !== 'object' || raw === null) {
    throw new NormalizationError(
      'Completion: expected an object mapping gap ref to value.'
    )
  }
  const map = new Map<string, GapResponse>()
  for (const [gapRef, value] of Object.entries(
    raw as Record<string, unknown>
  )) {
    if (
      typeof value !== 'string' &&
      !(Array.isArray(value) && value.every((v) => typeof v === 'string'))
    ) {
      throw new NormalizationError(
        `Completion: gap '${gapRef}' value must be a string or string array.`
      )
    }
    map.set(gapRef, value as GapResponse)
  }
  return map
}

// --- ShortInput / Essay ------------------------------------------------------------------

export type TypedScalar = string | number

export function normalizeShortEntry(
  raw: unknown,
  inputType: 'Text' | 'Number' | 'Date'
): TypedScalar {
  if (typeof raw !== 'string')
    throw new NormalizationError(
      'ShortEntry: expected a string representation of the typed input.'
    )
  if (inputType === 'Number') {
    const n = Number(raw)
    if (Number.isNaN(n))
      throw new NormalizationError('ShortEntry: value is not a valid number.')
    return n
  }
  return raw
}

export function normalizeExtendedTextEntry(raw: unknown): string {
  if (typeof raw !== 'string')
    throw new NormalizationError('ExtendedTextEntry: expected a string.')
  return raw
}

// --- ArtifactSubmission ------------------------------------------------------------------

export interface Artifact {
  ref: string
}

export function normalizeArtifactSubmission(raw: unknown): Artifact[] {
  if (!Array.isArray(raw))
    throw new NormalizationError('ArtifactSubmission: expected an array.')
  return raw.map((r) => {
    if (typeof r === 'string') return { ref: r }
    if (
      typeof r === 'object' &&
      r !== null &&
      typeof (r as Record<string, unknown>).ref === 'string'
    ) {
      return { ref: (r as Record<string, unknown>).ref as string }
    }
    throw new NormalizationError(
      'ArtifactSubmission: each artifact must be a string ref or { ref: string }.'
    )
  })
}

// --- Marking ------------------------------------------------------------------

export type Mark =
  | { kind: 'Point'; x: number; y: number }
  | { kind: 'Region'; x: number; y: number; width: number; height: number }
  | { kind: 'TextSpan'; start: number; end: number }

export function normalizeDirectMarking(raw: unknown): Mark[] {
  if (!Array.isArray(raw))
    throw new NormalizationError('DirectMarking: expected an array of marks.')
  return raw.map((m) => {
    if (typeof m !== 'object' || m === null)
      throw new NormalizationError(
        'DirectMarking: each mark must be an object.'
      )
    const mark = m as Record<string, unknown>
    if (
      mark.kind === 'Point' &&
      typeof mark.x === 'number' &&
      typeof mark.y === 'number'
    ) {
      return { kind: 'Point', x: mark.x, y: mark.y }
    }
    if (
      mark.kind === 'Region' &&
      typeof mark.x === 'number' &&
      typeof mark.y === 'number' &&
      typeof mark.width === 'number' &&
      typeof mark.height === 'number'
    ) {
      return {
        kind: 'Region',
        x: mark.x,
        y: mark.y,
        width: mark.width,
        height: mark.height,
      }
    }
    if (
      mark.kind === 'TextSpan' &&
      typeof mark.start === 'number' &&
      typeof mark.end === 'number'
    ) {
      return { kind: 'TextSpan', start: mark.start, end: mark.end }
    }
    throw new NormalizationError(
      'DirectMarking: mark does not match a supported MarkType shape.'
    )
  })
}

/** Registry keyed by `ResponseMechanismDescriptor.normalizationAdapterId`. `ShortEntry`
 * is registered generically (Text semantics); callers that know the QD `inputType`
 * should call `normalizeShortEntry` directly for Number/Date normalization. */
export const NORMALIZATION_REGISTRY: Record<string, (raw: unknown) => unknown> =
  {
    ListSelection: normalizeListSelection,
    SpatialSelection: normalizeSpatialSelection,
    DirectOrdering: normalizeDirectOrdering,
    OrderNotation: normalizeOrderNotation,
    DirectRelationConstruction: normalizeDirectRelationConstruction,
    RelationNotation: normalizeRelationNotation,
    Completion: normalizeCompletion,
    ShortEntry: (raw: unknown) => normalizeShortEntry(raw, 'Text'),
    ExtendedTextEntry: normalizeExtendedTextEntry,
    DigitalArtifactSubmission: normalizeArtifactSubmission,
    PhysicalArtifactSubmission: normalizeArtifactSubmission,
    DirectMarking: normalizeDirectMarking,
  }

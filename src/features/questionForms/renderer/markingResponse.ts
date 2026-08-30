import type { Marking } from '@/domain/qd/model'
import type { MarkingRealization } from '@/domain/qfd/model'

export interface RendererPointMark {
  kind: 'Point'
  offsetX: number
  offsetY: number
}

export interface RendererTextSpanMark {
  kind: 'TextSpan'
  selectedText: string
}

/** Renderer-local pixel offsets; deliberately not normalized or universal. */
export interface RendererRegionMark {
  kind: 'Region'
  startOffsetX: number
  startOffsetY: number
  endOffsetX: number
  endOffsetY: number
}

export interface RendererMarkingResponse {
  workspaceRealizationRef: string
  marks: Array<RendererPointMark | RendererRegionMark | RendererTextSpanMark>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPointMark(value: unknown): value is RendererPointMark {
  return (
    isRecord(value) &&
    value.kind === 'Point' &&
    typeof value.offsetX === 'number' &&
    Number.isFinite(value.offsetX) &&
    typeof value.offsetY === 'number' &&
    Number.isFinite(value.offsetY)
  )
}

function isTextSpanMark(value: unknown): value is RendererTextSpanMark {
  return (
    isRecord(value) &&
    value.kind === 'TextSpan' &&
    typeof value.selectedText === 'string' &&
    value.selectedText.trim().length > 0
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRegionMark(value: unknown): value is RendererRegionMark {
  return (
    isRecord(value) &&
    value.kind === 'Region' &&
    isFiniteNumber(value.startOffsetX) &&
    isFiniteNumber(value.startOffsetY) &&
    isFiniteNumber(value.endOffsetX) &&
    isFiniteNumber(value.endOffsetY) &&
    value.startOffsetX !== value.endOffsetX &&
    value.startOffsetY !== value.endOffsetY
  )
}

/** Strictly accepts this renderer's local payload for the exact QFD workspace. */
export function acceptsRendererMarkingResponse(
  interaction: Marking,
  realization: MarkingRealization,
  raw: unknown
): boolean {
  if (!isRecord(raw) || !Array.isArray(raw.marks)) return false
  if (raw.workspaceRealizationRef !== realization.workspaceRealizationRef)
    return false
  if (
    raw.marks.length < interaction.minMarks ||
    (interaction.maxMarks !== undefined &&
      raw.marks.length > interaction.maxMarks)
  )
    return false
  return raw.marks.every((mark) => {
    if (interaction.markType === 'Point') return isPointMark(mark)
    if (interaction.markType === 'Region') return isRegionMark(mark)
    return isTextSpanMark(mark)
  })
}

export function appendPointMark(
  previous: RendererMarkingResponse | undefined,
  workspaceRealizationRef: string,
  offsetX: number,
  offsetY: number
): RendererMarkingResponse {
  return {
    workspaceRealizationRef,
    marks: [
      ...(previous?.workspaceRealizationRef === workspaceRealizationRef
        ? previous.marks
        : []),
      { kind: 'Point', offsetX, offsetY },
    ],
  }
}

export function appendTextSpanMark(
  previous: RendererMarkingResponse | undefined,
  workspaceRealizationRef: string,
  selectedText: string
): RendererMarkingResponse {
  return {
    workspaceRealizationRef,
    marks: [
      ...(previous?.workspaceRealizationRef === workspaceRealizationRef
        ? previous.marks
        : []),
      { kind: 'TextSpan', selectedText },
    ],
  }
}

export function appendRegionMark(
  previous: RendererMarkingResponse | undefined,
  workspaceRealizationRef: string,
  startOffsetX: number,
  startOffsetY: number,
  endOffsetX: number,
  endOffsetY: number
): RendererMarkingResponse {
  return {
    workspaceRealizationRef,
    marks: [
      ...(previous?.workspaceRealizationRef === workspaceRealizationRef
        ? previous.marks
        : []),
      {
        kind: 'Region',
        startOffsetX,
        startOffsetY,
        endOffsetX,
        endOffsetY,
      },
    ],
  }
}

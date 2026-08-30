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

export interface RendererMarkingResponse {
  workspaceRealizationRef: string
  marks: Array<RendererPointMark | RendererTextSpanMark>
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
  if (interaction.markType === 'Region') return false
  return raw.marks.every((mark) =>
    interaction.markType === 'Point' ? isPointMark(mark) : isTextSpanMark(mark)
  )
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

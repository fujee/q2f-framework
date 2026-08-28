import type { QuestionDefinition } from '@/domain/qd/model'

/** Pixel rectangle an image occupies under `object-fit: contain` semantics
 * (the image is scaled to fit and centered inside the container). */
export interface ContainRect {
  left: number
  top: number
  width: number
  height: number
}

/** Computes the contain-fit rectangle of an image inside a container, both
 * given in the same pixel units. Returns an empty rect for degenerate inputs. */
export function containRect(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): ContainRect {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { left: 0, top: 0, width: 0, height: 0 }
  }
  const scale = Math.min(
    containerWidth / imageWidth,
    containerHeight / imageHeight
  )
  const width = imageWidth * scale
  const height = imageHeight * scale
  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  }
}

/** A Completing gap whose position is defined by a QD RegionAnchor over a
 * Workspace image, expressed in normalized (0..1) coordinates relative to the
 * image itself (not the layout block that hosts the image). */
export interface QdAnchoredGapInfo {
  gapId: string
  code: string
  x: number
  y: number
  width: number
  height: number
}

/** Lists the QD-anchored gaps bound to the given image stimulus. These are the
 * gaps the renderer must position relative to the image content, not the block. */
export function qdAnchoredGapsForStimulus(
  qd: QuestionDefinition,
  stimulusId: string
): QdAnchoredGapInfo[] {
  const gaps: QdAnchoredGapInfo[] = []
  for (const interaction of qd.responseInteractions) {
    if (interaction.type !== 'Completing') continue
    for (const gap of interaction.completingGaps) {
      if (gap.stimulusRef !== stimulusId) continue
      if (gap.anchor?.kind !== 'RegionAnchor') continue
      gaps.push({
        gapId: gap.id,
        code: gap.code,
        x: gap.anchor.x,
        y: gap.anchor.y,
        width: gap.anchor.width,
        height: gap.anchor.height,
      })
    }
  }
  return gaps
}

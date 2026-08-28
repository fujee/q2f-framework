/**
 * Reference-implementation metadata for the otherwise abstract scientific
 * Content carrier. These flags only state whether this concrete carrier can
 * resolve each baseline SourceAnchor distinction. They are not QD fields,
 * Content subtypes, modality declarations, or universal locator semantics.
 */
export interface ReferenceContentCarrier {
  representation: string
  sourceAnchorSupport: {
    text: boolean
    region: boolean
  }
}

export function referenceContentCarrier(
  representation: string,
  sourceAnchorSupport: Partial<
    ReferenceContentCarrier['sourceAnchorSupport']
  > = {}
): ReferenceContentCarrier {
  return {
    representation,
    sourceAnchorSupport: {
      text: sourceAnchorSupport.text ?? false,
      region: sourceAnchorSupport.region ?? false,
    },
  }
}

export function hasConcreteContent(
  content: string | ReferenceContentCarrier | undefined
): boolean {
  if (typeof content === 'string') return content.trim().length > 0
  return Boolean(content?.representation.trim())
}

export function supportsSourceAnchor(
  content: string | ReferenceContentCarrier | undefined,
  anchorKind: 'TextAnchor' | 'RegionAnchor'
): boolean {
  if (!content || typeof content === 'string') return false
  return anchorKind === 'TextAnchor'
    ? content.sourceAnchorSupport.text
    : content.sourceAnchorSupport.region
}

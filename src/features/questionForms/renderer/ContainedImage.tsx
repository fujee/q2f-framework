import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { containRect, type ContainRect } from '../lib/imageRegionGeometry'

export interface ImageRegion {
  key: string
  x: number
  y: number
  width: number
  height: number
}

/** Renders an image centered inside its box (`object-fit: contain` semantics)
 * and overlays children on the *visible image* rather than the box, so region
 * anchors stay glued to the image even when it is letterboxed by a box with a
 * different aspect ratio. */
export function ContainedImage({
  src,
  alt,
  regions,
  renderRegion,
  children,
}: {
  src: string
  alt: string
  regions: ImageRegion[]
  renderRegion?: (region: ImageRegion, rect: ContainRect) => ReactNode
  children?: (rect: ContainRect) => ReactNode
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)

  const recordNatural = useCallback((img: HTMLImageElement | null) => {
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNatural((prev) =>
        prev && prev.w === img.naturalWidth && prev.h === img.naturalHeight
          ? prev
          : { w: img.naturalWidth, h: img.naturalHeight }
      )
    }
  }, [])

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      recordNatural(e.currentTarget)
    },
    [recordNatural]
  )

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      setBox((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const rect =
    natural && box && natural.w > 0 && natural.h > 0 && box.w > 0 && box.h > 0
      ? containRect(box.w, box.h, natural.w, natural.h)
      : null

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden">
      <img
        src={src}
        alt={alt}
        ref={recordNatural}
        className="pointer-events-none absolute top-1/2 left-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2"
        onLoad={handleLoad}
      />
      {rect &&
        renderRegion &&
        regions.map((region) => (
          <div
            key={region.key}
            className="absolute"
            style={{
              left: rect.left + region.x * rect.width,
              top: rect.top + region.y * rect.height,
              width: region.width * rect.width,
              height: region.height * rect.height,
            }}
          >
            {renderRegion(region, rect)}
          </div>
        ))}
      {rect && children && children(rect)}
    </div>
  )
}

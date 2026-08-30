import type { ReactNode } from 'react'
import type {
  LayoutElement,
  LayoutableRealizationRef,
} from '@/domain/qfd/model'

export function LayoutTree({
  layout,
  renderPlacement,
}: {
  layout: LayoutElement
  renderPlacement: (ref: LayoutableRealizationRef) => ReactNode
}): ReactNode {
  if (layout.kind === 'LayoutPlacement')
    return renderPlacement(layout.realizationRef)
  return (
    <div
      className={`qfd-layout flex gap-3 ${layout.orientation === 'Horizontal' ? 'flex-row flex-wrap' : 'flex-col'}`}
      data-orientation={layout.orientation}
    >
      {layout.children.map((child, index) => (
        <LayoutTree
          key={index}
          layout={child}
          renderPlacement={renderPlacement}
        />
      ))}
    </div>
  )
}

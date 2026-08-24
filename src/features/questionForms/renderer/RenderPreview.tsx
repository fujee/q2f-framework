import { useMemo, type ReactNode } from 'react'
import type { QuestionDefinition } from '@/domain/qd/model'
import type {
  CanvasItem,
  ContainerElement,
  ContentElement,
  Inline,
  LayoutElement,
  QuestionFormDefinition,
} from '@/domain/qfd/model'
import {
  buildRenderContext,
  interactionBlockRendersWidget,
  resolveRealizedStimulusContent,
  splitByMarkers,
  workspaceStimulus,
  type RenderContext,
} from './renderContext'
import { groupCanvasRows, rowGapPx, rowSpan } from './canvasLayout'
import {
  EffectiveInstruction,
  InteractionWidget,
  ResponseElementWidget,
  StimulusContent,
} from './interactionWidgets'
import { SelectionProvider } from './selectionContext'

function isContent(el: LayoutElement): el is ContentElement {
  return (
    el.kind === 'StimulusBlock' ||
    el.kind === 'InteractionBlock' ||
    el.kind === 'ResponseElementBlock'
  )
}

function ContentRenderer({
  ctx,
  el,
}: {
  ctx: RenderContext
  el: ContentElement
}): ReactNode {
  if (el.kind === 'StimulusBlock') {
    const sr = ctx.stimulusRealizationById.get(el.stimulusRealizationRef)
    const stimulus = sr ? ctx.stimulusById.get(sr.stimulusRef) : undefined
    if (!stimulus)
      return <div className="text-xs text-destructive">Missing stimulus</div>
    return <StimulusContent stimulus={stimulus} sr={sr} />
  }

  if (el.kind === 'InteractionBlock') {
    const ir = ctx.interactionRealizationById.get(el.interactionRealizationRef)
    const interaction = ir
      ? ctx.interactionById.get(ir.interactionRef)
      : undefined
    if (!ir || !interaction)
      return <div className="text-xs text-destructive">Missing interaction</div>
    return (
      <div className="space-y-1.5">
        <EffectiveInstruction interaction={interaction} ir={ir} />
        <InteractionWidget ctx={ctx} interaction={interaction} ir={ir} />
      </div>
    )
  }

  return (
    <ResponseElementWidget
      ctx={ctx}
      elementKind={el.elementKind}
      elementRef={el.elementRef}
    />
  )
}

function InlineRenderer({
  ctx,
  container,
}: {
  ctx: RenderContext
  container: Inline
}): ReactNode {
  const consumed = new Set<number>()
  const rendered: ReactNode[] = []
  const anchored = container.items
    .map((item, i) => ({ item, i }))
    .filter(
      ({ item }) => item.anchor?.kind === 'TextAnchor' && item.anchor.marker
    )

  // A DirectMarking + TextSpan interaction renders the stimulus text itself as
  // the selectable marking surface, so the standalone StimulusBlock for that
  // text is skipped within this Inline container.
  const directMarkingTextStimulusIds = new Set<string>()
  for (const item of container.items) {
    if (item.child.kind === 'InteractionBlock') {
      const ir = ctx.interactionRealizationById.get(
        item.child.interactionRealizationRef
      )
      if (ir?.mechanism !== 'DirectMarking') continue
      const interaction = ctx.interactionById.get(ir.interactionRef)
      if (
        interaction?.type === 'Marking' &&
        interaction.markType === 'TextSpan'
      ) {
        const ws = workspaceStimulus(ctx, interaction.id)
        if (ws?.type === 'Text') directMarkingTextStimulusIds.add(ws.id)
      }
    }
  }

  container.items.forEach((item, idx) => {
    if (consumed.has(idx)) return
    const child = item.child
    if (child.kind === 'StimulusBlock') {
      const sr = ctx.stimulusRealizationById.get(child.stimulusRealizationRef)
      const stimulus = sr ? ctx.stimulusById.get(sr.stimulusRef) : undefined
      if (stimulus && directMarkingTextStimulusIds.has(stimulus.id)) {
        return // rendered by the DirectMarking widget
      }
      const content = stimulus
        ? resolveRealizedStimulusContent(stimulus, sr)
        : undefined
      if (stimulus?.type === 'Text' && content) {
        const reps = anchored.filter(({ i }) => !consumed.has(i))
        if (reps.length > 0) {
          const replacements = reps.map(({ item: anchorItem, i }) => {
            consumed.add(i)
            const anchor = anchorItem.anchor
            return {
              marker: anchor?.kind === 'TextAnchor' ? anchor.marker : '',
              node: NodeRenderer({ ctx, el: anchorItem.child }),
            }
          })
          rendered.push(
            <span key={idx}>{splitByMarkers(content, replacements)}</span>
          )
          return
        }
      }
    }
    rendered.push(
      <span key={idx} className="inline-block align-middle">
        <NodeRenderer ctx={ctx} el={child} />
      </span>
    )
  })

  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">{rendered}</div>
  )
}

/** Renders only the mechanism widget of an InteractionBlock, without the
 * instruction. Used inside Canvas, where the instruction is hoisted above the
 * surface and the widget is placed spatially. */
function InteractionWidgetOnly({
  ctx,
  irRef,
}: {
  ctx: RenderContext
  irRef: string
}): ReactNode {
  const ir = ctx.interactionRealizationById.get(irRef)
  const interaction = ir
    ? ctx.interactionById.get(ir.interactionRef)
    : undefined
  if (!ir || !interaction) {
    return <div className="text-xs text-destructive">Missing interaction</div>
  }
  return <InteractionWidget ctx={ctx} interaction={interaction} ir={ir} />
}

/** Renders a layout element inside a Canvas: InteractionBlocks render only
 * their widget (instruction is hoisted above the surface); everything else
 * renders normally. */
function SpatialNodeRenderer({
  ctx,
  el,
}: {
  ctx: RenderContext
  el: LayoutElement
}): ReactNode {
  if (el.kind === 'InteractionBlock') {
    return (
      <InteractionWidgetOnly ctx={ctx} irRef={el.interactionRealizationRef} />
    )
  }
  return <NodeRenderer ctx={ctx} el={el} />
}

function ContainerRenderer({
  ctx,
  container,
}: {
  ctx: RenderContext
  container: ContainerElement
}): ReactNode {
  switch (container.kind) {
    case 'Stack':
      return (
        <div
          className={`flex gap-3 ${container.direction === 'Horizontal' ? 'flex-row flex-wrap' : 'flex-col'}`}
        >
          {container.children.map((child, i) => (
            <div key={i} className="min-w-0">
              <NodeRenderer ctx={ctx} el={child} />
            </div>
          ))}
        </div>
      )
    case 'Grid':
      return (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${container.columns}, minmax(0, 1fr))`,
          }}
        >
          {container.items.map((item, i) => (
            <div
              key={i}
              className="min-w-0"
              style={{
                gridColumn: `${item.column + 1} / span ${item.columnSpan}`,
                gridRow: `${item.row + 1} / span ${item.rowSpan}`,
              }}
            >
              <NodeRenderer ctx={ctx} el={item.child} />
            </div>
          ))}
        </div>
      )
    case 'Canvas': {
      // The instruction of an InteractionBlock is hoisted above the surface;
      // its widget (when it renders visible content) is placed spatially, so
      // placed options never overlap the question text.
      const headers: ReactNode[] = []
      const spatialItems: CanvasItem[] = []
      for (const item of container.items) {
        if (item.child.kind === 'InteractionBlock') {
          const ref = item.child.interactionRealizationRef
          const ir = ctx.interactionRealizationById.get(ref)
          const interaction = ir
            ? ctx.interactionById.get(ir.interactionRef)
            : undefined
          if (ir && interaction) {
            headers.push(
              <EffectiveInstruction
                key={ref}
                interaction={interaction}
                ir={ir}
              />
            )
          }
          if (interactionBlockRendersWidget(ctx, ref)) {
            spatialItems.push(item)
          }
          continue
        }
        spatialItems.push(item)
      }

      const rows = groupCanvasRows(spatialItems)
      if (rows.length === 0) {
        return (
          <div className="space-y-2">
            {headers.length > 0 && <div className="space-y-1">{headers}</div>}
            <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
              Empty canvas
            </div>
          </div>
        )
      }
      return (
        <div className="space-y-2">
          {headers.length > 0 && <div className="space-y-1">{headers}</div>}
          <div className="rounded-md border border-dashed border-border bg-muted/10 p-2">
            {rows.map((row, ri) => {
              const span = rowSpan(row)
              return (
                <div
                  key={ri}
                  className="relative"
                  style={{
                    marginTop:
                      ri === 0 ? 0 : rowGapPx(rows[ri - 1].bottom, row.top),
                  }}
                >
                  {/* Base establishes the row's actual height and horizontal offset. */}
                  <div
                    className="relative"
                    style={{
                      marginLeft: `${row.base.area.x * 100}%`,
                      width: `${row.base.area.width * 100}%`,
                    }}
                  >
                    <SpatialNodeRenderer ctx={ctx} el={row.base.child} />
                    {row.overlay.map((o, j) => (
                      <div
                        key={`overlay-${j}`}
                        className="absolute"
                        style={{
                          left: `${o.style.leftPct}%`,
                          top: `${o.style.topPct}%`,
                          width: `${o.style.widthPct}%`,
                          height: `${o.style.heightPct}%`,
                        }}
                      >
                        <SpatialNodeRenderer ctx={ctx} el={o.item.child} />
                      </div>
                    ))}
                  </div>
                  {/* Side items keep their horizontal position within the row. */}
                  {row.side.map((item, j) => (
                    <div
                      key={`side-${j}`}
                      className="absolute"
                      style={{
                        left: `${item.area.x * 100}%`,
                        top: `${((item.area.y - row.top) / span) * 100}%`,
                        width: `${item.area.width * 100}%`,
                      }}
                    >
                      <SpatialNodeRenderer ctx={ctx} el={item.child} />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    case 'Inline':
      return <InlineRenderer ctx={ctx} container={container} />
  }
}

function NodeRenderer({
  ctx,
  el,
}: {
  ctx: RenderContext
  el: LayoutElement
}): ReactNode {
  return isContent(el) ? (
    <ContentRenderer ctx={ctx} el={el} />
  ) : (
    <ContainerRenderer ctx={ctx} container={el} />
  )
}

/** Renders the composed question as an interactive web presentation (HTML). */
export function QfdPreview({
  qd,
  qfd,
}: {
  qd: QuestionDefinition
  qfd: QuestionFormDefinition
}) {
  const ctx = useMemo(() => buildRenderContext(qd, qfd), [qd, qfd])
  return (
    <SelectionProvider>
      <div className="space-y-3 rounded-lg border border-border bg-background p-4">
        <ContainerRenderer ctx={ctx} container={qfd.rootLayout} />
      </div>
    </SelectionProvider>
  )
}

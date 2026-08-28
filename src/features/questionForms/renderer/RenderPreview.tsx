import { useMemo, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import type { QuestionDefinition, ResponseInteraction } from '@/domain/qd/model'
import type {
  CanvasItem,
  ContainerElement,
  ContentElement,
  Inline,
  InteractionRealization,
  LayoutElement,
  QuestionFormDefinition,
  ResponseElementBlock,
} from '@/domain/qfd/model'
import {
  buildRenderContext,
  directMarkingForStimulus,
  imageWorkspaceSrRefForResponse,
  interactionBlockRendersWidget,
  isQdAnchoredGap,
  resolveRealizedStimulusContent,
  splitByMarkers,
  workspaceStimulus,
  type RenderContext,
} from './renderContext'
import { CANVAS_BASE_HEIGHT_PX } from './canvasLayout'
import {
  CompletionBankWidget,
  EffectiveInstruction,
  InteractionWidget,
  MarkingWidget,
  ResponseElementWidget,
  StimulusContent,
} from './interactionWidgets'
import { SelectionProvider } from './selectionContext'
import { ContainedImage } from './ContainedImage'
import { qdAnchoredGapsForStimulus } from '../lib/imageRegionGeometry'
import { CompletionProvider } from './completionContext'
import { RuntimeProgressProvider, useRuntimeProgress } from './runtimeProgress'

function isContent(el: LayoutElement): el is ContentElement {
  return (
    el.kind === 'StimulusBlock' ||
    el.kind === 'InteractionBlock' ||
    el.kind === 'ResponseElementBlock'
  )
}

function InteractionLockNote({
  predecessor,
}: {
  predecessor?: ResponseInteraction
}): ReactNode {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <Lock className="size-3.5 shrink-0" />
      <span>
        Locked — answer{' '}
        <span className="font-medium text-foreground/80">
          {predecessor?.code ?? 'the previous interaction'}
        </span>{' '}
        correctly to unlock.
      </span>
    </div>
  )
}

/** An InteractionBlock gated by QD Required dependencies: hidden/disabled until
 * every RequiresCorrectness predecessor is answered correctly (and every
 * RequiresCompletion predecessor is answered). */
function GatedInteraction({
  ctx,
  interaction,
  ir,
}: {
  ctx: RenderContext
  interaction: ResponseInteraction
  ir: InteractionRealization
}): ReactNode {
  const { isUnlocked, blockingPredecessor } = useRuntimeProgress()
  if (!isUnlocked(interaction.id)) {
    return (
      <InteractionLockNote predecessor={blockingPredecessor(interaction.id)} />
    )
  }
  return (
    <div className="space-y-1.5">
      <EffectiveInstruction interaction={interaction} ir={ir} />
      <InteractionWidget ctx={ctx} interaction={interaction} ir={ir} />
    </div>
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
    return <GatedInteraction ctx={ctx} interaction={interaction} ir={ir} />
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

/** Renders a Workspace image with its interaction's response elements (choices,
 * gaps) overlaid on the *visible image* rather than against the Canvas. Their
 * QFD areas are image-relative (protocol §Q9/Q10), so letterboxing from a
 * differently-proportioned Canvas must not detach them from the image. */
function StimulusWithResponseOverlays({
  ctx,
  srRef,
  responseItems,
}: {
  ctx: RenderContext
  srRef: string
  responseItems: CanvasItem[]
}) {
  const sr = ctx.stimulusRealizationById.get(srRef)
  const stimulus = sr ? ctx.stimulusById.get(sr.stimulusRef) : undefined
  const content =
    stimulus && sr ? resolveRealizedStimulusContent(stimulus, sr) : undefined
  if (!stimulus) {
    return <div className="text-xs text-destructive">Missing stimulus</div>
  }
  if (!content) {
    return <StimulusContent stimulus={stimulus} sr={sr} fill />
  }

  const kinds = new Map(
    responseItems.map((item) => {
      const child = item.child as ResponseElementBlock
      return [child.elementRef, child.elementKind] as const
    })
  )

  return (
    <ContainedImage
      src={content}
      alt={stimulus.code}
      regions={responseItems.map((item) => ({
        key: (item.child as ResponseElementBlock).elementRef,
        x: item.area.x,
        y: item.area.y,
        width: item.area.width,
        height: item.area.height,
      }))}
      renderRegion={(region) => (
        <ResponseElementWidget
          ctx={ctx}
          elementKind={kinds.get(region.key) ?? 'Choice'}
          elementRef={region.key}
          fill
        />
      )}
    />
  )
}

/** Renders a layout element inside a Canvas. InteractionBlocks render only
 * their widget (instruction is hoisted above the surface); StimulusBlocks fill
 * their assigned area so the preview matches the editor's placement. */
function CanvasNodeRenderer({
  ctx,
  el,
}: {
  ctx: RenderContext
  el: LayoutElement
}): ReactNode {
  const { isUnlocked } = useRuntimeProgress()
  if (el.kind === 'InteractionBlock') {
    return (
      <InteractionWidgetOnly ctx={ctx} irRef={el.interactionRealizationRef} />
    )
  }
  if (el.kind === 'StimulusBlock') {
    const sr = ctx.stimulusRealizationById.get(el.stimulusRealizationRef)
    const stimulus = sr ? ctx.stimulusById.get(sr.stimulusRef) : undefined
    if (!stimulus) {
      return <div className="text-xs text-destructive">Missing stimulus</div>
    }
    const content = resolveRealizedStimulusContent(stimulus, sr)
    if (stimulus.type === 'Image' && content) {
      const marking = directMarkingForStimulus(ctx, stimulus.id)
      if (marking && isUnlocked(marking.interaction.id)) {
        // The marking surface is the workspace image; render it once with the
        // interactive marks overlaid, never as a duplicate StimulusBlock.
        return <MarkingWidget ctx={ctx} interaction={marking.interaction} />
      }
      const anchoredGaps = qdAnchoredGapsForStimulus(ctx.qd, stimulus.id)
      if (anchoredGaps.length > 0) {
        return (
          <ContainedImage
            src={content}
            alt={stimulus.code}
            regions={anchoredGaps.map((g) => ({
              key: g.gapId,
              x: g.x,
              y: g.y,
              width: g.width,
              height: g.height,
            }))}
            renderRegion={(region) => (
              <ResponseElementWidget
                ctx={ctx}
                elementKind="CompletingGap"
                elementRef={region.key}
                fill
              />
            )}
          />
        )
      }
    }
    return <StimulusContent stimulus={stimulus} sr={sr} fill />
  }
  if (el.kind === 'ResponseElementBlock') {
    return (
      <ResponseElementWidget
        ctx={ctx}
        elementKind={el.elementKind}
        elementRef={el.elementRef}
        fill
      />
    )
  }
  return <ContainerRenderer ctx={ctx} container={el} />
}

function ContainerRenderer({
  ctx,
  container,
}: {
  ctx: RenderContext
  container: ContainerElement
}): ReactNode {
  const { isUnlocked, blockingPredecessor } = useRuntimeProgress()
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
      // Response elements whose owner integrates a Workspace image are overlaid
      // on that image (image-relative coordinates), not placed against the Canvas.
      const hostedResponseItems = new Map<string, CanvasItem[]>()

      const imageStimulusRefs = new Set<string>()
      for (const item of container.items) {
        if (item.child.kind !== 'StimulusBlock') continue
        const sr = ctx.stimulusRealizationById.get(
          item.child.stimulusRealizationRef
        )
        const stimulus = sr ? ctx.stimulusById.get(sr.stimulusRef) : undefined
        if (stimulus?.type === 'Image')
          imageStimulusRefs.add(item.child.stimulusRealizationRef)
      }

      for (const item of container.items) {
        if (item.child.kind === 'InteractionBlock') {
          const ref = item.child.interactionRealizationRef
          const ir = ctx.interactionRealizationById.get(ref)
          const interaction = ir
            ? ctx.interactionById.get(ir.interactionRef)
            : undefined
          const unlocked =
            ir && interaction ? isUnlocked(interaction.id) : false
          if (ir && interaction) {
            if (unlocked) {
              headers.push(
                <EffectiveInstruction
                  key={ref}
                  interaction={interaction}
                  ir={ir}
                />
              )
              if (
                interaction.type === 'Completing' &&
                !interactionBlockRendersWidget(ctx, ref)
              ) {
                headers.push(
                  <CompletionBankWidget
                    key={`${ref}-bank`}
                    interaction={interaction}
                  />
                )
              }
            } else {
              headers.push(
                <InteractionLockNote
                  key={`${ref}-lock`}
                  predecessor={blockingPredecessor(interaction.id)}
                />
              )
            }
          }
          if (interactionBlockRendersWidget(ctx, ref) && unlocked) {
            spatialItems.push(item)
          }
          continue
        }
        if (
          item.child.kind === 'ResponseElementBlock' &&
          item.child.elementKind === 'CompletingGap' &&
          isQdAnchoredGap(ctx, item.child.elementRef)
        ) {
          // QD-anchored gaps are rendered inside the stimulus content below,
          // never by a (stale) QFD placement.
          continue
        }
        if (item.child.kind === 'ResponseElementBlock') {
          const hostSr = imageWorkspaceSrRefForResponse(
            ctx,
            item.child.elementKind,
            item.child.elementRef
          )
          if (hostSr && imageStimulusRefs.has(hostSr)) {
            const list = hostedResponseItems.get(hostSr) ?? []
            list.push(item)
            hostedResponseItems.set(hostSr, list)
            continue
          }
        }
        spatialItems.push(item)
      }

      if (spatialItems.length === 0) {
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
          <div
            className="relative w-full overflow-hidden rounded-md border border-dashed border-border bg-muted/10"
            style={{ height: CANVAS_BASE_HEIGHT_PX }}
          >
            {spatialItems.map((item, i) => {
              const child = item.child
              const isStimulus = child.kind === 'StimulusBlock'
              const hosted = isStimulus
                ? hostedResponseItems.get(child.stimulusRealizationRef)
                : undefined
              return (
                <div
                  key={i}
                  className="absolute overflow-hidden"
                  style={{
                    left: `${item.area.x * 100}%`,
                    top: `${item.area.y * 100}%`,
                    width: `${item.area.width * 100}%`,
                    height: `${item.area.height * 100}%`,
                    zIndex: item.layer,
                  }}
                >
                  {isStimulus && hosted && hosted.length > 0 ? (
                    <StimulusWithResponseOverlays
                      ctx={ctx}
                      srRef={child.stimulusRealizationRef}
                      responseItems={hosted}
                    />
                  ) : (
                    <CanvasNodeRenderer ctx={ctx} el={child} />
                  )}
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
    <RuntimeProgressProvider qd={qd}>
      <SelectionProvider>
        <CompletionProvider>
          <div className="space-y-3 rounded-lg border border-border bg-background p-4">
            <ContainerRenderer ctx={ctx} container={qfd.rootLayout} />
          </div>
        </CompletionProvider>
      </SelectionProvider>
    </RuntimeProgressProvider>
  )
}

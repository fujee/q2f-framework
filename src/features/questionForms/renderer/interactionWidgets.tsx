import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { ArrowDown, ArrowUp, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  Choice,
  Completing,
  CompletingGap,
  CompletingItem,
  Essay,
  Marking,
  Ordering,
  Relating,
  ResponseInteraction,
  Selecting,
  ShortInput,
  Stimulus,
} from '@/domain/qd/model'
import type {
  InteractionRealization,
  StimulusRealization,
} from '@/domain/qfd/model'
import { findOwningInteractionId } from '@/domain/qfd/layout'
import {
  findStimulusRealization,
  resolveRealizedStimulusContent,
  splitByMarkers,
  workspaceStimulus,
  type RenderContext,
} from './renderContext'
import { useSelection } from './selectionContext'
import { applyItemOrderPolicy } from './itemOrderPolicy'
import { regionFromPoints } from './markingRegion'

// ── Shared pieces ────────────────────────────────────────────────────────────

export function EffectiveInstruction({
  interaction,
  ir,
}: {
  interaction: ResponseInteraction
  ir: InteractionRealization
}) {
  const text = ir.realizedInstruction?.trim() || interaction.instruction
  if (!text) return null
  return <div className="max-w-[70ch] text-sm text-foreground/90">{text}</div>
}

export function StimulusContent({
  stimulus,
  sr,
}: {
  stimulus: Stimulus
  sr?: StimulusRealization
}) {
  const content = resolveRealizedStimulusContent(stimulus, sr)
  if (stimulus.type === 'Text') {
    return (
      <div className="whitespace-pre-wrap text-sm leading-7">
        {content ?? ''}
      </div>
    )
  }
  if (stimulus.type === 'Image') {
    return content ? (
      <img
        src={content}
        alt={stimulus.code}
        className="max-h-72 rounded-md border border-border object-contain"
      />
    ) : (
      <div className="rounded-md border border-dashed border-border p-6 text-xs text-muted-foreground">
        No image content
      </div>
    )
  }
  if (stimulus.type === 'Audio') {
    return content ? (
      <audio controls src={content} className="w-full" />
    ) : (
      <div className="text-xs text-muted-foreground">No audio content</div>
    )
  }
  return content ? (
    <video
      controls
      src={content}
      className="max-h-72 rounded-md border border-border"
    />
  ) : (
    <div className="text-xs text-muted-foreground">No video content</div>
  )
}

function GapWidget({
  gap,
  items = [],
  compact = false,
}: {
  gap: CompletingGap
  items?: CompletingItem[]
  compact?: boolean
}) {
  // Gaps render as inline elements so they stay within the surrounding text
  // flow (CompletionWidget inlines them via splitByMarkers).
  const inline = 'align-middle'
  switch (gap.type) {
    case 'TextInputGap':
      return (
        <Input
          placeholder={
            gap.minLength || gap.maxLength
              ? `${gap.minLength ?? 0}–${gap.maxLength ?? '∞'} chars`
              : 'Text'
          }
          className={`${inline} ${compact ? 'h-7 w-32' : 'h-8 w-44'}`}
        />
      )
    case 'NumberInputGap':
      return (
        <Input
          type="number"
          placeholder="Number"
          className={`${inline} ${compact ? 'h-7 w-24' : 'h-8 w-28'}`}
        />
      )
    case 'DateInputGap':
      return (
        <Input
          type="date"
          className={`${inline} ${compact ? 'h-7 w-36' : 'h-8 w-40'}`}
        />
      )
    case 'DropTargetGap':
      return (
        <Select>
          <SelectTrigger
            className={`inline-flex ${inline} ${
              compact ? 'h-7 w-36 text-xs' : 'h-8 w-44 text-xs'
            }`}
          >
            <SelectValue placeholder="Choose item" />
          </SelectTrigger>
          <SelectContent>
            {items.map((it) => (
              <SelectItem key={it.id} value={it.id}>
                {it.type === 'TextCompletingItem' ? it.text : it.imageRef}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
  }
}

function Chip({ code, name }: { code: string; name?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs">
      <span className="font-mono text-muted-foreground">{code}</span>
      {name}
    </span>
  )
}

/** Independent placement of a QD response element (Choice token, gap input…). */
export function ResponseElementWidget({
  ctx,
  elementKind,
  elementRef,
}: {
  ctx: RenderContext
  elementKind: 'Choice' | 'OrderingItem' | 'RelatingElement' | 'CompletingGap'
  elementRef: string
}) {
  const { isSelected, toggle } = useSelection()
  const ownerId = findOwningInteractionId(ctx.qd, elementKind, elementRef)
  const owner = ownerId ? ctx.interactionById.get(ownerId) : undefined

  if (elementKind === 'Choice') {
    const choice =
      owner?.type === 'Selecting'
        ? owner.choices.find((c: Choice) => c.id === elementRef)
        : undefined
    const maxSelections = owner?.type === 'Selecting' ? owner.maxSelections : 1
    const selected = ownerId ? isSelected(ownerId, elementRef) : false
    return (
      <button
        type="button"
        onClick={() => {
          if (ownerId) toggle(ownerId, elementRef, maxSelections)
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
          selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background hover:border-primary'
        }`}
      >
        <span className="font-mono">{choice?.code ?? '?'}</span>
        {choice?.name}
      </button>
    )
  }

  if (elementKind === 'CompletingGap') {
    const gap = ctx.gapById.get(elementRef)
    const items = owner?.type === 'Completing' ? owner.completingItems : []
    return gap ? <GapWidget gap={gap} items={items} compact /> : null
  }

  if (elementKind === 'OrderingItem') {
    const item =
      owner?.type === 'Ordering'
        ? owner.orderingItems.find((i) => i.id === elementRef)
        : undefined
    return <Chip code={item?.code ?? '?'} name={item?.name} />
  }

  const element =
    owner?.type === 'Relating'
      ? [
          ...owner.sourceSet.relatingElements,
          ...owner.targetSet.relatingElements,
        ].find((e) => e.id === elementRef)
      : undefined
  return <Chip code={element?.code ?? '?'} name={element?.name} />
}

// ── Per-mechanism widgets ────────────────────────────────────────────────────

function ListSelectionWidget({ interaction }: { interaction: Selecting }) {
  const { isSelected, toggle } = useSelection()
  const single = interaction.maxSelections === 1
  const choices = useMemo(
    () =>
      applyItemOrderPolicy(interaction.choices, interaction.itemOrderPolicy),
    [interaction.choices, interaction.itemOrderPolicy]
  )

  return (
    <div className="space-y-1.5">
      {choices.map((c) => (
        <label
          key={c.id}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <input
            type={single ? 'radio' : 'checkbox'}
            name={`qfd-sel-${interaction.id}`}
            checked={isSelected(interaction.id, c.id)}
            onChange={() =>
              toggle(interaction.id, c.id, interaction.maxSelections)
            }
            className="accent-primary"
          />
          <span className="font-mono text-xs text-muted-foreground">
            {c.code}
          </span>
          {c.name}
        </label>
      ))}
    </div>
  )
}

function DirectOrderingWidget({ interaction }: { interaction: Ordering }) {
  const [ids, setIds] = useState(interaction.orderingItems.map((i) => i.id))
  const move = (index: number, delta: number) =>
    setIds((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  return (
    <div className="space-y-1">
      {ids.map((id, index) => {
        const item = interaction.orderingItems.find((i) => i.id === id)
        if (!item) return null
        return (
          <div
            key={id}
            className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm"
          >
            <span className="w-5 text-right text-xs text-muted-foreground">
              {index + 1}.
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {item.code}
            </span>
            <span className="flex-1">{item.name}</span>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ArrowUp className="size-3.5" />
            </button>
            <button
              type="button"
              disabled={index === ids.length - 1}
              onClick={() => move(index, 1)}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ArrowDown className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function OrderNotationWidget({ interaction }: { interaction: Ordering }) {
  const [ranks, setRanks] = useState<Record<string, string>>({})
  return (
    <div className="space-y-1.5">
      {interaction.orderingItems.map((item) => (
        <label key={item.id} className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs text-muted-foreground">
            {item.code}
          </span>
          <span className="flex-1">{item.name}</span>
          <Input
            type="number"
            min={1}
            max={interaction.orderingItems.length}
            className="h-7 w-16 text-xs"
            value={ranks[item.id] ?? ''}
            onChange={(e) =>
              setRanks((r) => ({ ...r, [item.id]: e.target.value }))
            }
          />
        </label>
      ))}
    </div>
  )
}

function DirectRelationWidget({ interaction }: { interaction: Relating }) {
  const [pairs, setPairs] = useState<{ source: string; target: string }[]>([])
  const [pendingSource, setPendingSource] = useState<string | null>(null)

  const clickTarget = (targetId: string) => {
    if (!pendingSource) return
    setPairs((p) => [...p, { source: pendingSource, target: targetId }])
    setPendingSource(null)
  }

  const sourceEls = interaction.sourceSet.relatingElements
  const targetEls = interaction.targetSet.relatingElements

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-6">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {interaction.sourceSet.name}
          </p>
          {sourceEls.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPendingSource(s.id)}
              className={`block rounded-md border px-2 py-1 text-left text-sm transition-colors ${
                pendingSource === s.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <span className="font-mono text-xs text-muted-foreground">
                {s.code}
              </span>{' '}
              {s.name}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {interaction.targetSet.name}
          </p>
          {targetEls.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => clickTarget(t.id)}
              className={`block rounded-md border px-2 py-1 text-left text-sm transition-colors ${
                pendingSource
                  ? 'border-primary hover:bg-primary/10'
                  : 'border-border'
              }`}
            >
              <span className="font-mono text-xs text-muted-foreground">
                {t.code}
              </span>{' '}
              {t.name}
            </button>
          ))}
        </div>
      </div>
      {pairs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pairs.map((p, i) => (
            <span
              key={i}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {sourceEls.find((s) => s.id === p.source)?.code}→
              {targetEls.find((t) => t.id === p.target)?.code}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function RelationNotationWidget({ interaction }: { interaction: Relating }) {
  const [mapping, setMapping] = useState<Record<string, string>>({})
  return (
    <div className="space-y-1.5">
      {interaction.targetSet.relatingElements.map((t) => (
        <div key={t.id} className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs text-muted-foreground">
            {t.code}
          </span>
          <span className="flex-1">{t.name}</span>
          <Select
            value={mapping[t.id]}
            onValueChange={(v) => setMapping((m) => ({ ...m, [t.id]: v }))}
          >
            <SelectTrigger className="h-7 w-40 text-xs">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {interaction.sourceSet.relatingElements.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}

function CompletionWidget({ interaction }: { interaction: Completing }) {
  const localGaps = interaction.completingGaps.filter((g) => !g.stimulusRef)
  const content = interaction.localContent

  if (content) {
    const markerGaps = localGaps.filter(
      (g) => g.anchor?.kind === 'TextAnchor' && g.anchor.marker
    )
    if (markerGaps.length > 0) {
      return (
        <div className="whitespace-pre-wrap text-sm leading-9">
          {splitByMarkers(
            content,
            markerGaps.map((g) => ({
              marker: g.anchor?.kind === 'TextAnchor' ? g.anchor.marker : '',
              node: (
                <GapWidget
                  gap={g}
                  items={interaction.completingItems}
                  compact
                />
              ),
            }))
          )}
        </div>
      )
    }
    return (
      <div className="space-y-2">
        <div className="whitespace-pre-wrap text-sm leading-7">{content}</div>
        <div className="flex flex-wrap gap-2">
          {localGaps.map((g) => (
            <GapWidget key={g.id} gap={g} items={interaction.completingItems} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {localGaps.map((g) => (
        <GapWidget key={g.id} gap={g} items={interaction.completingItems} />
      ))}
    </div>
  )
}

function ShortEntryWidget({ interaction }: { interaction: ShortInput }) {
  const type =
    interaction.inputType === 'Text'
      ? 'text'
      : interaction.inputType === 'Number'
        ? 'number'
        : 'date'
  return (
    <Input type={type} className="w-56" placeholder={interaction.inputType} />
  )
}

function ExtendedTextWidget({ interaction }: { interaction: Essay }) {
  const hint = interaction.lengthUnit
    ? `${interaction.minLength ?? 0}–${interaction.maxLength ?? '∞'} ${interaction.lengthUnit.toLowerCase()}`
    : undefined
  return (
    <div className="space-y-1">
      <Textarea
        rows={5}
        placeholder={hint ? `Write ${hint}` : 'Write your answer'}
      />
    </div>
  )
}

function ArtifactWidget({ digital }: { digital: boolean }) {
  if (digital) {
    return (
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground hover:border-primary/50">
        <Upload className="size-4" />
        Attach files
        <input type="file" multiple className="sr-only" />
      </label>
    )
  }
  return (
    <div className="rounded-md border-2 border-dashed border-border p-4 text-center text-xs text-muted-foreground">
      Physical submission — attach on paper
    </div>
  )
}

type Mark =
  | { kind: 'point'; x: number; y: number }
  | { kind: 'region'; x: number; y: number; width: number; height: number }

interface TextSpanMark {
  start: number
  end: number
}

/** Interactive TextSpan marking: drag across the words of the stimulus text to
 * select a span; the selected span is highlighted. */
function TextSpanMarking({
  content,
  maxMarks,
}: {
  content: string
  maxMarks: number
}) {
  const [marks, setMarks] = useState<TextSpanMark[]>([])
  const [drag, setDrag] = useState<{ start: number; current: number } | null>(
    null
  )

  const parts = useMemo(() => {
    const out: { text: string; wordIndex: number | null }[] = []
    const regex = /[^\s]+/g
    let lastIndex = 0
    let wordCount = 0
    let m: RegExpExecArray | null
    while ((m = regex.exec(content)) !== null) {
      if (m.index > lastIndex) {
        out.push({ text: content.slice(lastIndex, m.index), wordIndex: null })
      }
      out.push({ text: m[0], wordIndex: wordCount++ })
      lastIndex = m.index + m[0].length
    }
    if (lastIndex < content.length) {
      out.push({ text: content.slice(lastIndex), wordIndex: null })
    }
    return out
  }, [content])

  const isActive = (wordIndex: number | null): boolean => {
    if (wordIndex === null) return false
    if (drag) {
      const start = Math.min(drag.start, drag.current)
      const end = Math.max(drag.start, drag.current)
      return wordIndex >= start && wordIndex <= end
    }
    return marks.some((s) => wordIndex >= s.start && wordIndex <= s.end)
  }

  const commit = () => {
    if (!drag) return
    const start = Math.min(drag.start, drag.current)
    const end = Math.max(drag.start, drag.current)
    setMarks((prev) =>
      prev.length >= maxMarks ? prev : [...prev, { start, end }]
    )
    setDrag(null)
  }

  return (
    <div className="space-y-1">
      <div
        className="select-none whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-sm leading-7"
        onMouseUp={commit}
        onMouseLeave={commit}
      >
        {parts.map((part, i) =>
          part.wordIndex === null ? (
            <span key={i}>{part.text}</span>
          ) : (
            <span
              key={i}
              onMouseDown={() =>
                setDrag({ start: part.wordIndex!, current: part.wordIndex! })
              }
              onMouseEnter={() => {
                if (drag) setDrag({ ...drag, current: part.wordIndex! })
              }}
              className={`rounded-sm transition-colors ${
                isActive(part.wordIndex)
                  ? 'bg-primary/40'
                  : 'hover:bg-muted-foreground/10'
              }`}
            >
              {part.text}
            </span>
          )
        )}
      </div>
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-muted-foreground">
          Drag across the words to mark a text span.
        </p>
        {marks.length > 0 && (
          <button
            type="button"
            onClick={() => setMarks([])}
            className="text-[11px] text-destructive hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

function MarkingWidget({
  ctx,
  interaction,
}: {
  ctx: RenderContext
  interaction: Marking
}) {
  const [marks, setMarks] = useState<Mark[]>([])
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  )
  const [dragCurrent, setDragCurrent] = useState<{
    x: number
    y: number
  } | null>(null)
  const isRegion = interaction.markType === 'Region'

  const stimulus = workspaceStimulus(ctx, interaction.id)
  if (!stimulus)
    return (
      <div className="text-xs text-destructive">
        No workspace stimulus available for marking.
      </div>
    )
  const content = resolveRealizedStimulusContent(
    stimulus,
    findStimulusRealization(ctx, stimulus.id)
  )

  if (stimulus.type === 'Text') {
    if (!content)
      return (
        <div className="text-xs text-muted-foreground">
          No text content for marking.
        </div>
      )
    // The stimulus text itself is the selectable marking surface.
    return <TextSpanMarking content={content} maxMarks={interaction.maxMarks} />
  }
  if (!content)
    return (
      <div className="text-xs text-muted-foreground">
        No image content for marking.
      </div>
    )

  const toPoint = (e: ReactMouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (marks.length >= interaction.maxMarks) return
    if (isRegion) {
      setDragStart(toPoint(e))
    } else {
      const p = toPoint(e)
      setMarks((prev) => [...prev, { kind: 'point', ...p }])
    }
  }

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isRegion || !dragStart) return
    setDragCurrent(toPoint(e))
  }

  const handleMouseUp = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isRegion || !dragStart) return
    const region = regionFromPoints(dragStart, toPoint(e))
    if (region.width > 0.005 || region.height > 0.005) {
      setMarks((prev) =>
        prev.length >= interaction.maxMarks
          ? prev
          : [...prev, { kind: 'region', ...region }]
      )
    }
    setDragStart(null)
    setDragCurrent(null)
  }

  const liveRegion =
    isRegion && dragStart && dragCurrent
      ? regionFromPoints(dragStart, dragCurrent)
      : null

  return (
    <div
      className="relative inline-block cursor-crosshair select-none overflow-hidden rounded-md border border-border"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setDragStart(null)
        setDragCurrent(null)
      }}
    >
      <img
        src={content}
        alt={stimulus.code}
        draggable={false}
        className="max-h-72 select-none"
      />
      {marks.map((m, i) =>
        m.kind === 'point' ? (
          <span
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground"
            style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
          >
            ● {i + 1}
          </span>
        ) : (
          <span
            key={i}
            className="pointer-events-none absolute border-2 border-primary bg-primary/20"
            style={{
              left: `${m.x * 100}%`,
              top: `${m.y * 100}%`,
              width: `${m.width * 100}%`,
              height: `${m.height * 100}%`,
            }}
          >
            <span className="absolute left-0 top-0 rounded-br bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              Region {i + 1}
            </span>
          </span>
        )
      )}
      {liveRegion && (
        <span
          className="pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10"
          style={{
            left: `${liveRegion.x * 100}%`,
            top: `${liveRegion.y * 100}%`,
            width: `${liveRegion.width * 100}%`,
            height: `${liveRegion.height * 100}%`,
          }}
        />
      )}
      <p className="absolute bottom-1 left-1 rounded bg-background/85 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {isRegion ? 'Drag to mark a region' : 'Click to mark'} · {marks.length}/
        {interaction.maxMarks}
      </p>
    </div>
  )
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

export function InteractionWidget({
  ctx,
  interaction,
  ir,
}: {
  ctx: RenderContext
  interaction: ResponseInteraction
  ir: InteractionRealization
}) {
  switch (ir.mechanism) {
    case 'ListSelection':
      return <ListSelectionWidget interaction={interaction as Selecting} />
    case 'SpatialSelection':
      return null // choices are rendered as placed ResponseElementBlocks
    case 'DirectOrdering':
      return <DirectOrderingWidget interaction={interaction as Ordering} />
    case 'OrderNotation':
      return <OrderNotationWidget interaction={interaction as Ordering} />
    case 'DirectRelationConstruction':
      return <DirectRelationWidget interaction={interaction as Relating} />
    case 'RelationNotation':
      return <RelationNotationWidget interaction={interaction as Relating} />
    case 'Completion':
      return <CompletionWidget interaction={interaction as Completing} />
    case 'ShortEntry':
      return <ShortEntryWidget interaction={interaction as ShortInput} />
    case 'ExtendedTextEntry':
      return <ExtendedTextWidget interaction={interaction as Essay} />
    case 'DigitalArtifactSubmission':
      return <ArtifactWidget digital />
    case 'PhysicalArtifactSubmission':
      return <ArtifactWidget digital={false} />
    case 'DirectMarking':
      return <MarkingWidget ctx={ctx} interaction={interaction as Marking} />
  }
}

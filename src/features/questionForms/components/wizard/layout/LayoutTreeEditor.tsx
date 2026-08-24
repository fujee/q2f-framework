import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { QuestionDefinition } from '@/domain/qd/model'
import type {
  Canvas,
  CanvasArea,
  CanvasItem,
  ContainerElement,
  ContentElement,
  Grid,
  Inline,
  LayoutElement,
  Stack,
} from '@/domain/qfd/model'
import { useQuestionFormEditorStore } from '../../../store/questionFormEditorStore'
import {
  collectPlacedRefs,
  emptyContainer,
  type LayoutPath,
  type NewCanvasSlot,
  type NewGridSlot,
} from '../../../lib/layoutTree'
import { computeAddableBlocks } from '../../../lib/addableLayoutBlocks'
import { describeContentElement } from '../../../lib/describeLayoutNode'

const CONTAINER_KINDS: ContainerElement['kind'][] = [
  'Stack',
  'Grid',
  'Canvas',
  'Inline',
]

function isContainer(el: LayoutElement): el is ContainerElement {
  return (
    el.kind === 'Stack' ||
    el.kind === 'Grid' ||
    el.kind === 'Canvas' ||
    el.kind === 'Inline'
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

// ── Add panel (shared by Stack/Inline/Canvas toolbars and Grid cell "+" targets) ──

interface AddPanelProps {
  path: LayoutPath
  qd: QuestionDefinition
  fixedSlot?: NewGridSlot | NewCanvasSlot
  onDone?: () => void
}

function AddPanel({ path, qd, fixedSlot, onDone }: AddPanelProps) {
  const { draft, addLayoutChild } = useQuestionFormEditorStore()
  const [mode, setMode] = useState<'container' | 'block'>('block')
  const [containerKind, setContainerKind] =
    useState<ContainerElement['kind']>('Stack')

  const placed = draft.rootLayout
    ? collectPlacedRefs(draft.rootLayout)
    : {
        stimulusRealizationRefs: [],
        interactionRealizationRefs: [],
        responseElements: [],
      }
  const addable = computeAddableBlocks(qd, draft, placed)

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-2">
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant={mode === 'block' ? 'secondary' : 'ghost'}
          className="h-6 text-[11px]"
          onClick={() => setMode('block')}
        >
          Block
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'container' ? 'secondary' : 'ghost'}
          className="h-6 text-[11px]"
          onClick={() => setMode('container')}
        >
          Container
        </Button>
      </div>

      {mode === 'block' && (
        <>
          {addable.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nothing left to add.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {addable.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  addLayoutChild(path, item.element, fixedSlot)
                  onDone?.()
                }}
                className="rounded-full border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === 'container' && (
        <div className="flex items-center gap-2">
          <Select
            value={containerKind}
            onValueChange={(v) =>
              setContainerKind(v as ContainerElement['kind'])
            }
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTAINER_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              addLayoutChild(path, emptyContainer(containerKind), fixedSlot)
              onDone?.()
            }}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  )
}

function AddToolbar({
  path,
  qd,
}: {
  path: LayoutPath
  qd: QuestionDefinition
}) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" />
        Add here
      </Button>
    )
  }
  return <AddPanel path={path} qd={qd} onDone={() => setOpen(false)} />
}

// ── Leaf content block (used inside Stack/Inline lists and Grid/Canvas cells) ────

function BlockChip({
  element,
  qd,
}: {
  element: ContentElement
  qd: QuestionDefinition
}) {
  return (
    <div className="truncate rounded border border-border/60 bg-muted/30 px-2 py-1 text-xs">
      {describeContentElement(element, qd)}
    </div>
  )
}

function ReorderControls({
  path,
  index,
  count,
}: {
  path: LayoutPath
  index: number
  count: number
}) {
  const { moveLayoutChild } = useQuestionFormEditorStore()
  return (
    <div className="flex flex-col">
      <button
        type="button"
        title="Move earlier in logical order"
        disabled={index === 0}
        onClick={() => moveLayoutChild(path, index, index - 1)}
        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ArrowUp className="size-3" />
      </button>
      <button
        type="button"
        title="Move later in logical order"
        disabled={index === count - 1}
        onClick={() => moveLayoutChild(path, index, index + 1)}
        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ArrowDown className="size-3" />
      </button>
    </div>
  )
}

// ── Stack ─────────────────────────────────────────────────────────────────────

function StackEditor({
  container,
  path,
  qd,
}: {
  container: Stack
  path: LayoutPath
  qd: QuestionDefinition
}) {
  const { updateLayoutContainerProps, removeLayoutChild } =
    useQuestionFormEditorStore()

  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <div className="flex items-center gap-2">
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
          Stack
        </span>
        <Select
          value={container.direction}
          onValueChange={(v) =>
            updateLayoutContainerProps(path, { direction: v })
          }
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Vertical">Vertical</SelectItem>
            <SelectItem value="Horizontal">Horizontal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className={
          container.direction === 'Horizontal'
            ? 'flex flex-wrap items-start gap-2'
            : 'space-y-2'
        }
      >
        {container.children.map((child, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <ReorderControls
              path={path}
              index={i}
              count={container.children.length}
            />
            <div className="min-w-0 flex-1">
              {isContainer(child) ? (
                <ContainerEditor
                  container={child}
                  path={[...path, i]}
                  qd={qd}
                />
              ) : (
                <BlockChip element={child} qd={qd} />
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeLayoutChild(path, i)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        {container.children.length === 0 && (
          <p className="text-xs text-muted-foreground">Empty stack.</p>
        )}
      </div>

      <AddToolbar path={path} qd={qd} />
    </div>
  )
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function GridEditor({
  container,
  path,
  qd,
}: {
  container: Grid
  path: LayoutPath
  qd: QuestionDefinition
}) {
  const {
    updateLayoutContainerProps,
    updateLayoutGridSlot,
    removeLayoutChild,
  } = useQuestionFormEditorStore()
  const [addingAt, setAddingAt] = useState<{
    row: number
    column: number
  } | null>(null)

  const anchors = new Map<string, number>()
  const blocked = new Set<string>()
  container.items.forEach((item, i) => {
    for (let r = item.row; r < item.row + item.rowSpan; r++) {
      for (let c = item.column; c < item.column + item.columnSpan; c++) {
        blocked.add(`${r},${c}`)
      }
    }
    anchors.set(`${item.row},${item.column}`, i)
  })

  const cells: React.ReactNode[] = []
  for (let r = 0; r < container.rows; r++) {
    for (let c = 0; c < container.columns; c++) {
      const key = `${r},${c}`
      const anchorIndex = anchors.get(key)
      if (anchorIndex !== undefined) {
        const item = container.items[anchorIndex]
        cells.push(
          <div
            key={key}
            style={{
              gridColumn: `${c + 1} / span ${item.columnSpan}`,
              gridRow: `${r + 1} / span ${item.rowSpan}`,
            }}
            className="flex min-h-14 flex-col gap-1 rounded border border-border bg-background p-1.5"
          >
            <div className="flex items-center justify-between gap-1">
              <ReorderControls
                path={path}
                index={anchorIndex}
                count={container.items.length}
              />
              <div className="flex items-center gap-1">
                {(['rowSpan', 'columnSpan'] as const).map((f) => (
                  <label
                    key={f}
                    className="flex items-center gap-0.5 text-[10px] text-muted-foreground"
                  >
                    {f === 'rowSpan' ? 'R' : 'C'}
                    <Input
                      type="number"
                      min={1}
                      className="h-5 w-9 px-1 text-[10px]"
                      value={item[f]}
                      onChange={(e) =>
                        updateLayoutGridSlot(path, anchorIndex, {
                          [f]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLayoutChild(path, anchorIndex)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              {isContainer(item.child) ? (
                <ContainerEditor
                  container={item.child}
                  path={[...path, anchorIndex]}
                  qd={qd}
                />
              ) : (
                <BlockChip element={item.child} qd={qd} />
              )}
            </div>
          </div>
        )
        continue
      }
      if (blocked.has(key)) continue
      cells.push(
        <button
          key={key}
          type="button"
          style={{ gridColumn: c + 1, gridRow: r + 1 }}
          onClick={() => setAddingAt({ row: r, column: c })}
          className="flex min-h-14 items-center justify-center rounded border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus className="size-4" />
        </button>
      )
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
          Grid
        </span>
        <div className="flex items-center gap-1">
          <Label className="text-xs">Rows</Label>
          <Input
            type="number"
            min={1}
            className="h-7 w-16 text-xs"
            value={container.rows}
            onChange={(e) =>
              updateLayoutContainerProps(path, { rows: Number(e.target.value) })
            }
          />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-xs">Columns</Label>
          <Input
            type="number"
            min={1}
            className="h-7 w-16 text-xs"
            value={container.columns}
            onChange={(e) =>
              updateLayoutContainerProps(path, {
                columns: Number(e.target.value),
              })
            }
          />
        </div>
      </div>

      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${container.columns}, minmax(90px, 1fr))`,
          gridTemplateRows: `repeat(${container.rows}, minmax(56px, auto))`,
        }}
      >
        {cells}
      </div>

      {addingAt && (
        <AddPanel
          path={path}
          qd={qd}
          fixedSlot={{
            row: addingAt.row,
            column: addingAt.column,
            rowSpan: 1,
            columnSpan: 1,
          }}
          onDone={() => setAddingAt(null)}
        />
      )}
    </div>
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

interface CanvasDragState {
  mode: 'move' | 'resize'
  startClientX: number
  startClientY: number
  startArea: CanvasArea
}

function CanvasItemBox({
  item,
  index,
  path,
  qd,
  canvasRef,
}: {
  item: CanvasItem
  index: number
  path: LayoutPath
  qd: QuestionDefinition
  canvasRef: React.RefObject<HTMLDivElement | null>
}) {
  const { updateLayoutCanvasSlot, removeLayoutChild } =
    useQuestionFormEditorStore()
  const dragRef = useRef<CanvasDragState | null>(null)
  const [liveArea, setLiveArea] = useState<CanvasArea | null>(null)
  const area = liveArea ?? item.area

  const handleDragStart = (
    mode: CanvasDragState['mode'],
    e: React.PointerEvent
  ) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragRef.current = {
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startArea: item.area,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const dx = (e.clientX - drag.startClientX) / rect.width
    const dy = (e.clientY - drag.startClientY) / rect.height

    if (drag.mode === 'move') {
      setLiveArea({
        ...drag.startArea,
        x: clamp(drag.startArea.x + dx, 0, 1 - drag.startArea.width),
        y: clamp(drag.startArea.y + dy, 0, 1 - drag.startArea.height),
      })
    } else {
      setLiveArea({
        ...drag.startArea,
        width: clamp(drag.startArea.width + dx, 0.03, 1 - drag.startArea.x),
        height: clamp(drag.startArea.height + dy, 0.03, 1 - drag.startArea.y),
      })
    }
  }

  const endDrag = () => {
    if (dragRef.current && liveArea)
      updateLayoutCanvasSlot(path, index, { area: liveArea })
    dragRef.current = null
    setLiveArea(null)
  }

  return (
    <div
      className="absolute overflow-hidden rounded border border-primary/50 bg-background/95 shadow-sm select-none"
      style={{
        left: `${area.x * 100}%`,
        top: `${area.y * 100}%`,
        width: `${area.width * 100}%`,
        height: `${area.height * 100}%`,
        zIndex: item.layer,
      }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
    >
      <div
        className="flex cursor-move items-center justify-between gap-1 border-b border-border/60 bg-muted/70 px-1 py-0.5 text-[10px]"
        onPointerDown={(e) => handleDragStart('move', e)}
      >
        <span className="truncate">
          {describeContentElement(item.child as ContentElement, qd)}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Layer -"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() =>
              updateLayoutCanvasSlot(path, index, { layer: item.layer - 1 })
            }
            className="text-muted-foreground hover:text-foreground"
          >
            ‹
          </button>
          <span className="text-muted-foreground">L{item.layer}</span>
          <button
            type="button"
            title="Layer +"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() =>
              updateLayoutCanvasSlot(path, index, { layer: item.layer + 1 })
            }
            className="text-muted-foreground hover:text-foreground"
          >
            ›
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => removeLayoutChild(path, index)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
      <div
        className="absolute right-0 bottom-0 size-3 cursor-nwse-resize rounded-tl bg-primary/60"
        onPointerDown={(e) => handleDragStart('resize', e)}
      />
    </div>
  )
}

function CanvasEditor({
  container,
  path,
  qd,
}: {
  container: Canvas
  path: LayoutPath
  qd: QuestionDefinition
}) {
  const canvasRef = useRef<HTMLDivElement>(null)

  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
        Canvas
      </span>
      <p className="text-[11px] text-muted-foreground">
        Drag a block to move it; drag its bottom-right corner to resize.
      </p>

      <div
        ref={canvasRef}
        className="relative w-full rounded-md border-2 border-dashed border-border bg-muted/10"
        style={{ minHeight: 480 }}
      >
        {container.items.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Empty canvas — add a block below.
          </p>
        )}
        {container.items.map((item, i) =>
          isContainer(item.child) ? (
            <div
              key={i}
              className="absolute overflow-auto rounded border border-primary/50 bg-background/95 p-1"
              style={{
                left: `${item.area.x * 100}%`,
                top: `${item.area.y * 100}%`,
                width: `${item.area.width * 100}%`,
                height: `${item.area.height * 100}%`,
                zIndex: item.layer,
              }}
            >
              <ContainerEditor
                container={item.child}
                path={[...path, i]}
                qd={qd}
              />
            </div>
          ) : (
            <CanvasItemBox
              key={i}
              item={item}
              index={i}
              path={path}
              qd={qd}
              canvasRef={canvasRef}
            />
          )
        )}
      </div>

      <AddToolbar path={path} qd={qd} />
    </div>
  )
}

// ── Inline ────────────────────────────────────────────────────────────────────

function InlineEditor({
  container,
  path,
  qd,
}: {
  container: Inline
  path: LayoutPath
  qd: QuestionDefinition
}) {
  const { removeLayoutChild, updateLayoutInlineAnchor } =
    useQuestionFormEditorStore()

  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
        Inline
      </span>

      <div className="flex flex-wrap items-start gap-2">
        {container.items.map((item, i) => (
          <div key={i} className="flex items-start gap-1">
            <ReorderControls
              path={path}
              index={i}
              count={container.items.length}
            />
            <div className="space-y-1">
              {isContainer(item.child) ? (
                <ContainerEditor
                  container={item.child}
                  path={[...path, i]}
                  qd={qd}
                />
              ) : (
                <BlockChip element={item.child} qd={qd} />
              )}
              <Input
                className="h-6 w-32 text-[10px]"
                placeholder="text marker e.g. {{1}}"
                value={item.anchor?.marker ?? ''}
                onChange={(e) =>
                  updateLayoutInlineAnchor(
                    path,
                    i,
                    e.target.value
                      ? { kind: 'TextAnchor', marker: e.target.value }
                      : undefined
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeLayoutChild(path, i)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        {container.items.length === 0 && (
          <p className="text-xs text-muted-foreground">Empty.</p>
        )}
      </div>

      <AddToolbar path={path} qd={qd} />
    </div>
  )
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function ContainerEditor({
  container,
  path,
  qd,
}: {
  container: ContainerElement
  path: LayoutPath
  qd: QuestionDefinition
}) {
  switch (container.kind) {
    case 'Stack':
      return <StackEditor container={container} path={path} qd={qd} />
    case 'Grid':
      return <GridEditor container={container} path={path} qd={qd} />
    case 'Canvas':
      return <CanvasEditor container={container} path={path} qd={qd} />
    case 'Inline':
      return <InlineEditor container={container} path={path} qd={qd} />
  }
}

export function LayoutTreeEditor({ qd }: { qd: QuestionDefinition }) {
  const rootLayout = useQuestionFormEditorStore((s) => s.draft.rootLayout)
  if (!rootLayout) return null
  return <ContainerEditor container={rootLayout} path={[]} qd={qd} />
}

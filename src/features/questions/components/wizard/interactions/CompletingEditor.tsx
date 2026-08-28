import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  Trash2,
  Upload,
  Type,
  Hash,
  Calendar,
  GripHorizontal,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BaseInteractionEditor } from './BaseInteractionEditor'
import {
  baseInteractionSchema,
  type BaseInteractionFormData,
} from '@/features/questions/validation/interactionSchemas'
import { useQuestionEditorStore } from '@/features/questions/store/questionEditorStore'
import { STIMULUS_TYPE_MAP } from '@/lib/stimulusTypes'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import type {
  Completing,
  CompletingGap,
  CompletingItem,
  DropTargetGap,
  GapType,
  RegionAnchor,
  TextAnchor,
} from '@/domain/qd/model'

// ── Config ────────────────────────────────────────────────────────────────────

const NO_STIMULUS = '__no_stimulus__'

const GAP_TYPE_CONFIG: Record<GapType, { label: string; icon: typeof Type }> = {
  TextInputGap: { label: 'Text Input', icon: Type },
  NumberInputGap: { label: 'Number Input', icon: Hash },
  DateInputGap: { label: 'Date Input', icon: Calendar },
  DropTargetGap: { label: 'Drop Target', icon: GripHorizontal },
}

function defaultTextAnchor(code: string): TextAnchor {
  return { kind: 'TextAnchor', marker: `{{${code}}}` }
}
function defaultRegionAnchor(): RegionAnchor {
  return { kind: 'RegionAnchor', x: 0.1, y: 0.1, width: 0.2, height: 0.1 }
}

function createDefaultGap(type: GapType, code: string): CompletingGap {
  const id = crypto.randomUUID()
  switch (type) {
    case 'TextInputGap':
      return {
        id,
        code,
        type,
        anchor: defaultTextAnchor(code),
        correctValues: [],
        caseSensitive: false,
        trimWhitespace: true,
      }
    case 'NumberInputGap':
      return {
        id,
        code,
        type,
        anchor: defaultTextAnchor(code),
        correctValues: [],
      }
    case 'DateInputGap':
      return {
        id,
        code,
        type,
        anchor: defaultTextAnchor(code),
        correctValues: [],
      }
    case 'DropTargetGap':
      return {
        id,
        code,
        type,
        anchor: defaultRegionAnchor(),
        correctItemRefs: [],
      }
    default:
      throw new Error(`Unknown gap type: ${type as string}`)
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

interface CompletingEditorProps {
  interaction: InteractionDraft
  onSave: (updated: InteractionDraft) => void
  onClose: () => void
}

export function CompletingEditor({
  interaction,
  onSave,
  onClose,
}: CompletingEditorProps) {
  const draftStimuli = useQuestionEditorStore((s) => s.draft.stimuli)
  const completing = interaction.type === 'Completing' ? interaction : undefined
  const [items, setItems] = useState<CompletingItem[]>(
    completing?.completingItems ?? []
  )
  const [localContent, setLocalContent] = useState(
    completing?.localContent ?? ''
  )
  const [gaps, setGaps] = useState<CompletingGap[]>(() => {
    const existing = completing?.completingGaps ?? []
    if (draftStimuli.length === 1) {
      const only = draftStimuli[0].id
      return existing.map((g) =>
        g.stimulusRef ? g : { ...g, stimulusRef: only }
      )
    }
    return existing
  })
  const [newItemText, setNewItemText] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BaseInteractionFormData>({
    resolver: zodResolver(baseInteractionSchema),
    defaultValues: {
      code: interaction.code,
      instruction: interaction.instruction ?? '',
    },
  })

  // ── Item pool ──────────────────────────────────────────────────────────────

  const addTextItem = () => {
    if (!newItemText.trim()) return
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        code: `item${items.length + 1}`,
        type: 'TextCompletingItem',
        text: newItemText.trim(),
        usageLimit: 1,
      },
    ])
    setNewItemText('')
  }

  const addImageItem = (file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const imageRef = ev.target?.result as string
      setItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          code: `item${prev.length + 1}`,
          type: 'ImageCompletingItem',
          imageRef,
          usageLimit: 1,
        },
      ])
    }
    reader.readAsDataURL(file)
  }

  const updateItem = (id: string, patch: Partial<CompletingItem>) =>
    setItems(
      items.map((it) =>
        it.id === id ? ({ ...it, ...patch } as CompletingItem) : it
      )
    )

  const removeItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id))
    setGaps(
      gaps.map((g) =>
        g.type === 'DropTargetGap'
          ? {
              ...g,
              correctItemRefs: g.correctItemRefs.filter((ref) => ref !== id),
            }
          : g
      )
    )
  }

  // ── Gaps ───────────────────────────────────────────────────────────────────

  const applyDefaultStimulus = (g: CompletingGap): CompletingGap =>
    !g.stimulusRef && draftStimuli.length === 1
      ? { ...g, stimulusRef: draftStimuli[0].id }
      : g

  const addGap = (type: GapType) =>
    setGaps([
      ...gaps,
      applyDefaultStimulus(createDefaultGap(type, `g${gaps.length + 1}`)),
    ])

  const removeGap = (id: string) => setGaps(gaps.filter((g) => g.id !== id))

  const updateGap = (id: string, patch: Partial<CompletingGap>) =>
    setGaps(
      gaps.map((g) => (g.id === id ? ({ ...g, ...patch } as CompletingGap) : g))
    )

  const changeGapType = (id: string, newType: GapType) => {
    const existing = gaps.find((g) => g.id === id)
    if (!existing) return
    const fresh = createDefaultGap(newType, existing.code)
    setGaps(
      gaps.map((g) =>
        g.id === id
          ? {
              ...fresh,
              id: existing.id,
              anchor: existing.anchor,
              stimulusRef: existing.stimulusRef,
              placementSpecification: existing.placementSpecification,
            }
          : g
      )
    )
  }

  type AnchorMode = 'TextAnchor' | 'RegionAnchor' | 'PlacementSpecification'

  const changeAnchorMode = (id: string, mode: AnchorMode) => {
    const gap = gaps.find((g) => g.id === id)
    if (!gap) return
    if (mode === 'TextAnchor')
      updateGap(id, {
        anchor: defaultTextAnchor(gap.code),
        placementSpecification: undefined,
      })
    else if (mode === 'RegionAnchor')
      updateGap(id, {
        anchor: defaultRegionAnchor(),
        placementSpecification: undefined,
      })
    else
      updateGap(id, {
        anchor: undefined,
        placementSpecification: gap.placementSpecification ?? '',
      })
  }

  const toggleCorrectItem = (gapId: string, itemId: string, add: boolean) => {
    const gap = gaps.find((g) => g.id === gapId)
    if (!gap || gap.type !== 'DropTargetGap') return
    const next = add
      ? [...gap.correctItemRefs, itemId]
      : gap.correctItemRefs.filter((ref) => ref !== itemId)
    updateGap(gapId, { correctItemRefs: next })
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = (data: BaseInteractionFormData) => {
    if (gaps.length === 0) {
      setFormError(
        'Each completing interaction needs at least one gap. Click "+ Add Gap" to create one.'
      )
      return
    }
    setFormError(null)
    const updated: Completing = {
      id: interaction.id,
      type: 'Completing',
      code: data.code,
      instruction: data.instruction,
      localContent: localContent || undefined,
      completingItems: items,
      completingGaps: gaps,
    }
    onSave(updated)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const hasItems = items.length > 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <BaseInteractionEditor
        register={register}
        control={control}
        errors={errors}
      />

      {/* ═══ Section: Local Content ═══ */}
      <Separator />
      <div className="space-y-1.5">
        <Label htmlFor="cmp-local-content">Local Passage Content</Label>
        <Textarea
          id="cmp-local-content"
          placeholder="Text hosting any gaps that are not linked to a stimulus, e.g. The capital of France is {{g1}}."
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Required only for gaps below that are not linked to a stimulus.
        </p>
      </div>

      {/* ═══ Section: Item Pool ═══ */}
      <Separator />
      <div className="space-y-3 rounded-md border border-border p-4">
        <div>
          <p className="text-sm font-semibold">Item Pool</p>
          <p className="text-xs text-muted-foreground">
            Items that can be dragged into Drop Target gaps. Leave empty if you
            only need typed answer gaps.
          </p>
        </div>

        {/* Add row */}
        <div className="flex gap-2">
          <Input
            className="flex-1 text-sm"
            placeholder="Type a new item and press Enter…"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTextItem()
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addTextItem}
            disabled={!newItemText.trim()}
          >
            <Plus className="size-3.5" /> Add Text
          </Button>
          <Label className="cursor-pointer">
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                <Upload className="size-3.5" /> Upload
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) addImageItem(f)
              }}
            />
          </Label>
        </div>

        {/* Item list */}
        {hasItems && (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary text-xs font-semibold text-secondary-foreground">
                  {item.type === 'TextCompletingItem' ? (
                    <Type className="size-3" />
                  ) : (
                    <img
                      src={item.imageRef}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                  {item.code}
                </span>
                {item.type === 'TextCompletingItem' ? (
                  <Input
                    className="h-6 flex-1 text-xs"
                    value={item.text}
                    onChange={(e) =>
                      updateItem(item.id, {
                        text: e.target.value,
                      } as Partial<CompletingItem>)
                    }
                  />
                ) : (
                  <span className="flex-1 truncate text-xs text-muted-foreground">
                    Image item
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  <Label className="text-xs text-muted-foreground">
                    limit:
                  </Label>
                  <Input
                    type="number"
                    className="h-6 w-12 text-xs"
                    min={1}
                    value={
                      item.usageLimit === 'Unlimited' ? '' : item.usageLimit
                    }
                    placeholder="∞"
                    onChange={(e) =>
                      updateItem(item.id, {
                        usageLimit:
                          e.target.value === ''
                            ? 'Unlimited'
                            : Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {!hasItems && (
          <p className="text-xs italic text-muted-foreground">
            No items yet. Type a word/phrase above to add one.
          </p>
        )}
      </div>

      {/* ═══ Section: Gaps ═══ */}
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Gaps ({gaps.length})</p>
            <p className="text-xs text-muted-foreground">
              Each gap defines a slot where the respondent provides an answer.
            </p>
          </div>
          <Select value="" onValueChange={(v) => v && addGap(v as GapType)}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="+ Add Gap" />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(GAP_TYPE_CONFIG) as [
                  GapType,
                  (typeof GAP_TYPE_CONFIG)[GapType],
                ][]
              ).map(([t, cfg]) => (
                <SelectItem key={t} value={t}>
                  <span className="flex items-center gap-1.5">
                    <cfg.icon className="size-3.5" /> {cfg.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {formError}
          </div>
        )}

        {gaps.length === 0 && !formError && (
          <div className="rounded-md border border-dashed border-border py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No gaps defined yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Use the dropdown above to add one.
            </p>
          </div>
        )}

        {gaps.map((gap, i) => {
          const anchorMode: AnchorMode = gap.anchor
            ? gap.anchor.kind
            : 'PlacementSpecification'
          return (
            <div
              key={gap.id}
              className="space-y-4 rounded-lg border border-border bg-card p-4"
            >
              {/* ═ Gap header: index + code + type + delete ═ */}
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <Input
                  className="h-7 w-24 shrink-0 font-mono text-xs"
                  value={gap.code}
                  onChange={(e) => updateGap(gap.id, { code: e.target.value })}
                  placeholder="code"
                />
                <Select
                  value={gap.type}
                  onValueChange={(v) => changeGapType(gap.id, v as GapType)}
                >
                  <SelectTrigger className="h-7 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(GAP_TYPE_CONFIG) as [
                        GapType,
                        (typeof GAP_TYPE_CONFIG)[GapType],
                      ][]
                    ).map(([t, cfg]) => {
                      const CfgIcon = cfg.icon
                      return (
                        <SelectItem key={t} value={t}>
                          <CfgIcon className="size-3.5" /> {cfg.label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => removeGap(gap.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {/* ═ Anchor ═ */}
              <div className="space-y-2 rounded-md bg-muted/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  Where does this gap appear?
                </p>

                {/* Stimulus selector */}
                <Select
                  value={gap.stimulusRef ?? NO_STIMULUS}
                  onValueChange={(v) =>
                    updateGap(gap.id, {
                      stimulusRef: v === NO_STIMULUS ? undefined : v,
                    })
                  }
                >
                  <SelectTrigger className="h-7 w-full">
                    <SelectValue placeholder="Select a stimulus…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_STIMULUS}>
                      Not linked to a specific stimulus (uses local content)
                    </SelectItem>
                    {draftStimuli.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-1.5">
                          {(() => {
                            const Icon = STIMULUS_TYPE_MAP[s.type].icon
                            return (
                              <Icon className="size-3 text-muted-foreground" />
                            )
                          })()}
                          {s.code} —{' '}
                          {s.description || STIMULUS_TYPE_MAP[s.type].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-col gap-2">
                  <Select
                    value={anchorMode}
                    onValueChange={(v) =>
                      changeAnchorMode(gap.id, v as AnchorMode)
                    }
                  >
                    <SelectTrigger className="h-7 w-44 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TextAnchor">
                        In text content
                      </SelectItem>
                      <SelectItem value="RegionAnchor">
                        On image region
                      </SelectItem>
                      <SelectItem value="PlacementSpecification">
                        By specification (no fixed anchor)
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {gap.anchor?.kind === 'TextAnchor' && (
                    <div className="space-y-1">
                      <Input
                        className="h-7 font-mono text-xs"
                        placeholder="{{g1}}"
                        value={gap.anchor.marker}
                        onChange={(e) =>
                          updateGap(gap.id, {
                            anchor: {
                              ...gap.anchor!,
                              marker: e.target.value,
                            } as TextAnchor,
                          })
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Insert this marker into the local content or stimulus
                        text to mark where the gap goes.
                      </p>
                    </div>
                  )}

                  {gap.anchor?.kind === 'RegionAnchor' && (
                    <div>
                      <p className="mb-1 text-[10px] text-muted-foreground">
                        Region (normalised 0–1 relative to image size):
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        {(['x', 'y', 'width', 'height'] as const).map((f) => (
                          <div key={f}>
                            <Label className="text-[10px] text-muted-foreground">
                              {f}
                            </Label>
                            <Input
                              type="number"
                              className="h-7 text-xs"
                              step={0.01}
                              min={0}
                              max={1}
                              value={(gap.anchor as RegionAnchor)[f]}
                              onChange={(e) =>
                                updateGap(gap.id, {
                                  anchor: {
                                    ...(gap.anchor as RegionAnchor),
                                    [f]: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {anchorMode === 'PlacementSpecification' && (
                    <div>
                      <Textarea
                        className="text-xs"
                        placeholder="e.g. The marker nearest the largest city label."
                        value={gap.placementSpecification ?? ''}
                        onChange={(e) =>
                          updateGap(gap.id, {
                            placementSpecification: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ═ Type-specific answer config ═ */}
              <div className="space-y-2 rounded-md bg-muted/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  What answer is expected here?
                </p>

                {/* Text input gap */}
                {gap.type === 'TextInputGap' && (
                  <div className="space-y-2">
                    <ValueListEditor
                      values={gap.correctValues}
                      onChange={(values) =>
                        updateGap(gap.id, { correctValues: values })
                      }
                      placeholder="Accepted text"
                    />
                    {gap.correctValues.length === 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Min length</Label>
                          <Input
                            type="number"
                            min={0}
                            className="h-7 text-xs"
                            value={gap.minLength ?? ''}
                            placeholder="—"
                            onChange={(e) =>
                              updateGap(gap.id, {
                                minLength: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max length</Label>
                          <Input
                            type="number"
                            min={0}
                            className="h-7 text-xs"
                            value={gap.maxLength ?? ''}
                            placeholder="—"
                            onChange={(e) =>
                              updateGap(gap.id, {
                                maxLength: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-primary"
                          checked={gap.caseSensitive}
                          onChange={(e) =>
                            updateGap(gap.id, {
                              caseSensitive: e.target.checked,
                            })
                          }
                        />{' '}
                        Case-sensitive
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-primary"
                          checked={gap.trimWhitespace}
                          onChange={(e) =>
                            updateGap(gap.id, {
                              trimWhitespace: e.target.checked,
                            })
                          }
                        />{' '}
                        Trim whitespace
                      </label>
                    </div>
                  </div>
                )}

                {/* Number input gap */}
                {gap.type === 'NumberInputGap' && (
                  <div className="space-y-2">
                    <ValueListEditor
                      values={gap.correctValues.map(String)}
                      onChange={(values) =>
                        updateGap(gap.id, { correctValues: values.map(Number) })
                      }
                      placeholder="Accepted number"
                      inputType="number"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Min value</Label>
                        <Input
                          type="number"
                          className="h-7 text-xs"
                          value={gap.minValue ?? ''}
                          placeholder="—"
                          onChange={(e) =>
                            updateGap(gap.id, {
                              minValue: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Max value</Label>
                        <Input
                          type="number"
                          className="h-7 text-xs"
                          value={gap.maxValue ?? ''}
                          placeholder="—"
                          onChange={(e) =>
                            updateGap(gap.id, {
                              maxValue: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Date input gap */}
                {gap.type === 'DateInputGap' && (
                  <div className="space-y-2">
                    <ValueListEditor
                      values={gap.correctValues}
                      onChange={(values) =>
                        updateGap(gap.id, { correctValues: values })
                      }
                      placeholder="YYYY-MM-DD"
                      inputType="date"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Min date</Label>
                        <Input
                          type="date"
                          className="h-7 text-xs"
                          value={gap.minValue ?? ''}
                          onChange={(e) =>
                            updateGap(gap.id, {
                              minValue: e.target.value || undefined,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Max date</Label>
                        <Input
                          type="date"
                          className="h-7 text-xs"
                          value={gap.maxValue ?? ''}
                          onChange={(e) =>
                            updateGap(gap.id, {
                              maxValue: e.target.value || undefined,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Drop target gap */}
                {gap.type === 'DropTargetGap' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      The region defined above represents the drop zone. Select
                      which items are correct answers:
                    </p>
                    {items.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">
                        No items in the pool. Add items above first.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((item) => {
                          const label =
                            item.type === 'TextCompletingItem'
                              ? item.text
                              : 'Image'
                          const isCorrect = (
                            gap as DropTargetGap
                          ).correctItemRefs.includes(item.id)
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                toggleCorrectItem(gap.id, item.id, !isCorrect)
                              }
                              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                isCorrect
                                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted'
                              }`}
                            >
                              {isCorrect && '✔ '}
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Interaction</Button>
      </div>
    </form>
  )
}

/** Small add/remove pill-list editor shared by the three "typed" gap kinds. */
function ValueListEditor({
  values,
  onChange,
  placeholder,
  inputType = 'text',
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
  inputType?: 'text' | 'number' | 'date'
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const val = draft.trim()
    if (val && !values.includes(val)) onChange([...values, val])
    setDraft('')
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Correct values</Label>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-mono"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type={inputType}
          className="h-7 flex-1 text-xs"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  )
}

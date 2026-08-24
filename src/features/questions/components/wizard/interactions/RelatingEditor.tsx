import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  relatingScalarSchema,
  type RelatingScalarFormData,
} from '@/features/questions/validation/interactionSchemas'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import type {
  CorrectRelation,
  Relating,
  RelatingElement,
  RelatingSet,
} from '@/domain/qd/model'

interface RelatingEditorProps {
  interaction: InteractionDraft
  onSave: (updated: InteractionDraft) => void
  onClose: () => void
}

const DEFAULT_SOURCE_SET: RelatingSet = {
  code: 'set-a',
  name: 'Set A',
  elementOrderPolicy: 'Permutable',
  relatingElements: [],
}

const DEFAULT_TARGET_SET: RelatingSet = {
  code: 'set-b',
  name: 'Set B',
  elementOrderPolicy: 'Permutable',
  relatingElements: [],
}

function SetPanel({
  label,
  set,
  onNameChange,
  onAddElement,
  onUpdateElement,
  onRemoveElement,
}: {
  label: string
  set: RelatingSet
  onNameChange: (name: string) => void
  onAddElement: () => void
  onUpdateElement: (idx: number, patch: Partial<RelatingElement>) => void
  onRemoveElement: (id: string) => void
}) {
  return (
    <div className="flex-1 space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddElement}
        >
          <Plus className="size-3" /> Add
        </Button>
      </div>
      <Input
        className="text-sm"
        placeholder="Set name"
        value={set.name}
        onChange={(e) => onNameChange(e.target.value)}
      />
      {set.relatingElements.map((el, i) => (
        <div key={el.id} className="flex items-center gap-2">
          <Input
            className="w-20 shrink-0 font-mono text-xs"
            value={el.code}
            onChange={(e) => onUpdateElement(i, { code: e.target.value })}
          />
          <Input
            className="flex-1 text-sm"
            placeholder="Name"
            value={el.name}
            onChange={(e) => onUpdateElement(i, { name: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onRemoveElement(el.id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}

export function RelatingEditor({
  interaction,
  onSave,
  onClose,
}: RelatingEditorProps) {
  const relating = interaction.type === 'Relating' ? interaction : undefined
  const [sourceSet, setSourceSet] = useState<RelatingSet>(
    relating?.sourceSet ?? DEFAULT_SOURCE_SET
  )
  const [targetSet, setTargetSet] = useState<RelatingSet>(
    relating?.targetSet ?? DEFAULT_TARGET_SET
  )
  const [relations, setRelations] = useState<CorrectRelation[]>(
    relating?.correctRelations ?? []
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RelatingScalarFormData>({
    resolver: zodResolver(relatingScalarSchema),
    defaultValues: {
      code: interaction.code,
      instruction: interaction.instruction ?? '',
      mappingType: relating?.mappingType ?? 'OneToOne',
      sourceParticipationPolicy:
        relating?.sourceParticipationPolicy ?? 'Optional',
      sourceElementOrderPolicy:
        relating?.sourceSet.elementOrderPolicy ?? 'Permutable',
      targetElementOrderPolicy:
        relating?.targetSet.elementOrderPolicy ?? 'Permutable',
    },
  })

  // ── Set element helpers ───────────────────────────────────────────────────────

  const addElement = (isSource: boolean) => {
    const set = isSource ? sourceSet : targetSet
    const el: RelatingElement = {
      id: crypto.randomUUID(),
      code: `el${set.relatingElements.length + 1}`,
      name: '',
    }
    const updated = { ...set, relatingElements: [...set.relatingElements, el] }
    if (isSource) setSourceSet(updated)
    else setTargetSet(updated)
  }

  const updateElement = (
    isSource: boolean,
    idx: number,
    patch: Partial<RelatingElement>
  ) => {
    const set = isSource ? sourceSet : targetSet
    const updated = {
      ...set,
      relatingElements: set.relatingElements.map((el, i) =>
        i === idx ? { ...el, ...patch } : el
      ),
    }
    if (isSource) setSourceSet(updated)
    else setTargetSet(updated)
  }

  const removeElement = (isSource: boolean, id: string) => {
    const set = isSource ? sourceSet : targetSet
    const updated = {
      ...set,
      relatingElements: set.relatingElements.filter((el) => el.id !== id),
    }
    if (isSource) setSourceSet(updated)
    else setTargetSet(updated)
    // remove orphan relations
    setRelations(
      relations.filter((r) =>
        isSource ? r.sourceElementRef !== id : r.targetElementRef !== id
      )
    )
  }

  // ── Relations helpers ─────────────────────────────────────────────────────────

  const addRelation = () => {
    if (
      !sourceSet.relatingElements.length ||
      !targetSet.relatingElements.length
    )
      return
    setRelations([
      ...relations,
      {
        sourceElementRef: sourceSet.relatingElements[0].id,
        targetElementRef: targetSet.relatingElements[0].id,
      },
    ])
  }

  const updateRelation = (i: number, patch: Partial<CorrectRelation>) =>
    setRelations(relations.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const removeRelation = (i: number) =>
    setRelations(relations.filter((_, j) => j !== i))

  // ── Submit ────────────────────────────────────────────────────────────────────

  const onSubmit = (data: RelatingScalarFormData) => {
    const updated: Relating = {
      id: interaction.id,
      type: 'Relating',
      code: data.code,
      instruction: data.instruction,
      sourceSet: {
        ...sourceSet,
        elementOrderPolicy: data.sourceElementOrderPolicy,
      },
      targetSet: {
        ...targetSet,
        elementOrderPolicy: data.targetElementOrderPolicy,
      },
      mappingType: data.mappingType,
      sourceParticipationPolicy: data.sourceParticipationPolicy,
      correctRelations: relations,
    }
    onSave(updated)
  }

  // ── Set panel renderer ────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <BaseInteractionEditor
        register={register}
        control={control}
        errors={errors}
      />
      <Separator />

      {/* Sets */}
      <div className="flex gap-3">
        <SetPanel
          label="Source Set"
          set={sourceSet}
          onNameChange={(name) => setSourceSet({ ...sourceSet, name })}
          onAddElement={() => addElement(true)}
          onUpdateElement={(idx, patch) => updateElement(true, idx, patch)}
          onRemoveElement={(id) => removeElement(true, id)}
        />
        <SetPanel
          label="Target Set"
          set={targetSet}
          onNameChange={(name) => setTargetSet({ ...targetSet, name })}
          onAddElement={() => addElement(false)}
          onUpdateElement={(idx, patch) => updateElement(false, idx, patch)}
          onRemoveElement={(id) => removeElement(false, id)}
        />
      </div>

      <Separator />

      {/* Policies */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Mapping Type</Label>
          <Controller
            name="mappingType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OneToOne">One-to-one</SelectItem>
                  <SelectItem value="OneToMany">One-to-many</SelectItem>
                  <SelectItem value="ManyToOne">Many-to-one</SelectItem>
                  <SelectItem value="ManyToMany">Many-to-many</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Source Participation</Label>
          <Controller
            name="sourceParticipationPolicy"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Required">
                    Required (every source element must be used)
                  </SelectItem>
                  <SelectItem value="Optional">Optional</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Source Element Order</Label>
          <Controller
            name="sourceElementOrderPolicy"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">Fixed</SelectItem>
                  <SelectItem value="Permutable">Permutable</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Target Element Order</Label>
          <Controller
            name="targetElementOrderPolicy"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">Fixed</SelectItem>
                  <SelectItem value="Permutable">Permutable</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <Separator />

      {/* Correct relations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Correct Relations</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRelation}
            disabled={
              !sourceSet.relatingElements.length ||
              !targetSet.relatingElements.length
            }
          >
            <Plus className="size-3" /> Add Relation
          </Button>
        </div>
        {relations.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={r.sourceElementRef}
              onValueChange={(id) =>
                updateRelation(i, { sourceElementRef: id })
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceSet.relatingElements.map((el) => (
                  <SelectItem key={el.id} value={el.id}>
                    {el.name || el.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="shrink-0 text-sm text-muted-foreground">→</span>
            <Select
              value={r.targetElementRef}
              onValueChange={(id) =>
                updateRelation(i, { targetElementRef: id })
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetSet.relatingElements.map((el) => (
                  <SelectItem key={el.id} value={el.id}>
                    {el.name || el.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              onClick={() => removeRelation(i)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        {!sourceSet.relatingElements.length ||
        !targetSet.relatingElements.length ? (
          <p className="text-xs text-muted-foreground">
            Add elements to both sets before creating relations.
          </p>
        ) : null}
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

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
  selectingScalarSchema,
  type SelectingScalarFormData,
} from '@/features/questions/validation/interactionSchemas'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import type { Choice, Selecting } from '@/domain/qd/model'

interface SelectingEditorProps {
  interaction: InteractionDraft
  onSave: (updated: InteractionDraft) => void
  onClose: () => void
}

export function SelectingEditor({
  interaction,
  onSave,
  onClose,
}: SelectingEditorProps) {
  const selecting = interaction.type === 'Selecting' ? interaction : undefined
  const [choices, setChoices] = useState<Choice[]>(
    selecting?.choices ?? [
      { id: crypto.randomUUID(), code: 'a', name: '', isCorrect: true },
      { id: crypto.randomUUID(), code: 'b', name: '', isCorrect: false },
    ]
  )
  const [choiceError, setChoiceError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SelectingScalarFormData>({
    resolver: zodResolver(selectingScalarSchema),
    defaultValues: {
      code: interaction.code,
      instruction: interaction.instruction ?? '',
      minSelections: String(selecting?.minSelections ?? 1),
      maxSelections: String(selecting?.maxSelections ?? 1),
      itemOrderPolicy: selecting?.itemOrderPolicy ?? 'Permutable',
    },
  })

  const addChoice = () =>
    setChoices([
      ...choices,
      {
        id: crypto.randomUUID(),
        code: `c${choices.length + 1}`,
        name: '',
        isCorrect: false,
      },
    ])

  const removeChoice = (i: number) =>
    setChoices(choices.filter((_, j) => j !== i))

  const updateChoice = (i: number, patch: Partial<Choice>) =>
    setChoices(choices.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  const onSubmit = (data: SelectingScalarFormData) => {
    if (choices.length < 2) {
      setChoiceError('At least 2 choices are required.')
      return
    }
    setChoiceError(null)
    const updated: Selecting = {
      id: interaction.id,
      type: 'Selecting',
      code: data.code,
      instruction: data.instruction,
      choices,
      minSelections: Number(data.minSelections),
      maxSelections: Number(data.maxSelections),
      itemOrderPolicy: data.itemOrderPolicy,
    }
    onSave(updated)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <BaseInteractionEditor
        register={register}
        control={control}
        errors={errors}
      />
      <Separator />

      {/* Choices */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Choices</Label>
          <Button type="button" variant="outline" size="sm" onClick={addChoice}>
            <Plus className="size-3.5" /> Add Choice
          </Button>
        </div>
        {choices.map((choice, i) => (
          <div key={choice.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary shrink-0"
              checked={choice.isCorrect}
              title="Mark as correct"
              onChange={(e) => updateChoice(i, { isCorrect: e.target.checked })}
            />
            <Input
              className="w-20 shrink-0"
              placeholder="Code"
              value={choice.code}
              onChange={(e) => updateChoice(i, { code: e.target.value })}
            />
            <Input
              className="flex-1"
              placeholder="Name / text"
              value={choice.name}
              onChange={(e) => updateChoice(i, { name: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              onClick={() => removeChoice(i)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        {choiceError && (
          <p className="text-xs text-destructive">{choiceError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Check the box to mark a choice as correct.
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="sel-min">Min Selections</Label>
          <Input
            id="sel-min"
            type="number"
            min={1}
            {...register('minSelections')}
          />
          {errors.minSelections && (
            <p className="text-xs text-destructive">
              {String(errors.minSelections.message ?? '')}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sel-max">Max Selections</Label>
          <Input
            id="sel-max"
            type="number"
            min={1}
            {...register('maxSelections')}
          />
          {errors.maxSelections && (
            <p className="text-xs text-destructive">
              {String(errors.maxSelections.message ?? '')}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Item Order Policy</Label>
          <Controller
            name="itemOrderPolicy"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">Fixed (preserve order)</SelectItem>
                  <SelectItem value="Permutable">
                    Permutable (shuffle)
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
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

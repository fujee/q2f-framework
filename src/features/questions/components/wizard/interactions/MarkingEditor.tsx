import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
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
  markingSchema,
  type MarkingFormData,
} from '@/features/questions/validation/interactionSchemas'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import type { Marking } from '@/domain/qd/model'

interface MarkingEditorProps {
  interaction: InteractionDraft
  onSave: (updated: InteractionDraft) => void
  onClose: () => void
}

export function MarkingEditor({
  interaction,
  onSave,
  onClose,
}: MarkingEditorProps) {
  const marking = interaction.type === 'Marking' ? interaction : undefined

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MarkingFormData>({
    resolver: zodResolver(markingSchema),
    defaultValues: {
      code: interaction.code,
      instruction: interaction.instruction ?? '',
      markType: marking?.markType ?? 'Point',
      minMarks: String(marking?.minMarks ?? 1),
      maxMarks: String(marking?.maxMarks ?? 1),
    },
  })

  const onSubmit = (data: MarkingFormData) => {
    const updated: Marking = {
      id: interaction.id,
      type: 'Marking',
      code: data.code,
      instruction: data.instruction,
      markType: data.markType,
      minMarks: Number(data.minMarks),
      maxMarks: Number(data.maxMarks),
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

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Mark Type</Label>
          <Controller
            name="markType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Point">Point</SelectItem>
                  <SelectItem value="Region">Region</SelectItem>
                  <SelectItem value="TextSpan">Text Span</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mrk-min">Min Marks</Label>
          <Input id="mrk-min" type="number" min={1} {...register('minMarks')} />
          {errors.minMarks && (
            <p className="text-xs text-destructive">
              {String(errors.minMarks.message ?? '')}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mrk-max">Max Marks</Label>
          <Input id="mrk-max" type="number" min={1} {...register('maxMarks')} />
          {errors.maxMarks && (
            <p className="text-xs text-destructive">
              {String(errors.maxMarks.message ?? '')}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900/40 dark:bg-blue-950/30">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <p className="text-blue-800 dark:text-blue-300">
          Point/Region marks require a Workspace association to an image
          stimulus; Text Span marks require a Workspace association to a text
          stimulus. Set this in the <strong>Associations</strong> step.
        </p>
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

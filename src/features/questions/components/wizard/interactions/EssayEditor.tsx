import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
  essaySchema,
  type EssayFormData,
} from '@/features/questions/validation/interactionSchemas'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import type { Essay } from '@/domain/qd/model'

interface EssayEditorProps {
  interaction: InteractionDraft
  onSave: (updated: InteractionDraft) => void
  onClose: () => void
}

export function EssayEditor({
  interaction,
  onSave,
  onClose,
}: EssayEditorProps) {
  const essay = interaction.type === 'Essay' ? interaction : undefined
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EssayFormData>({
    resolver: zodResolver(essaySchema),
    defaultValues: {
      code: interaction.code,
      instruction: interaction.instruction ?? '',
      minLength: essay?.minLength?.toString() ?? '',
      maxLength: essay?.maxLength?.toString() ?? '',
      lengthUnit: essay?.lengthUnit ?? 'Words',
    },
  })

  const hasBound = Boolean(watch('minLength') || watch('maxLength'))

  const onSubmit = (data: EssayFormData) => {
    const updated: Essay = {
      id: interaction.id,
      type: 'Essay',
      code: data.code,
      instruction: data.instruction,
      minLength:
        data.minLength === '' || data.minLength === undefined
          ? undefined
          : Number(data.minLength),
      maxLength:
        data.maxLength === '' || data.maxLength === undefined
          ? undefined
          : Number(data.maxLength),
      lengthUnit:
        data.minLength || data.maxLength ? data.lengthUnit : undefined,
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
          <Label htmlFor="essay-min-length">Min Length</Label>
          <Input
            id="essay-min-length"
            type="number"
            min={0}
            placeholder="Optional"
            {...register('minLength')}
          />
          {errors.minLength && (
            <p className="text-xs text-destructive">
              {String(errors.minLength.message ?? '')}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="essay-max-length">Max Length</Label>
          <Input
            id="essay-max-length"
            type="number"
            min={1}
            placeholder="Optional"
            {...register('maxLength')}
          />
          {errors.maxLength && (
            <p className="text-xs text-destructive">
              {String(errors.maxLength.message ?? '')}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Length Unit</Label>
          <Controller
            name="lengthUnit"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!hasBound}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Words">Words</SelectItem>
                  <SelectItem value="Characters">Characters</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Leave both length fields empty for no length limit.
      </p>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Interaction</Button>
      </div>
    </form>
  )
}

import type {
  UseFormRegister,
  FieldErrors,
  Control,
  Path,
} from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/shared/RichTextEditor'
import type { BaseInteractionFormData } from '@/features/questions/validation/interactionSchemas'

interface BaseInteractionEditorProps<
  TFieldValues extends BaseInteractionFormData = BaseInteractionFormData,
> {
  register: UseFormRegister<TFieldValues>
  control: Control<TFieldValues>
  errors: FieldErrors<TFieldValues>
}

export function BaseInteractionEditor<
  TFieldValues extends BaseInteractionFormData = BaseInteractionFormData,
>({ register, control, errors }: BaseInteractionEditorProps<TFieldValues>) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="ia-code">
          Code <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ia-code"
          placeholder="e.g. q1, task-a"
          {...register('code' as Path<TFieldValues>)}
        />
        {errors.code && (
          <p className="text-xs text-destructive">
            {String(errors.code.message ?? '')}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ia-instruction">Instruction</Label>
        <Controller
          name={'instruction' as Path<TFieldValues>}
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="Optional instruction shown to respondent…"
              minimal
            />
          )}
        />
      </div>
    </div>
  )
}

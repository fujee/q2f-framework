import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { baseStimulusSchema } from '@/features/questions/validation/stimulusSchemas'
import type { z } from 'zod'

export type BaseStimulusFormData = z.infer<typeof baseStimulusSchema>

interface BaseStimulusFieldsProps<TFieldValues extends BaseStimulusFormData> {
  register: UseFormRegister<TFieldValues>
  control: Control<TFieldValues>
  errors: FieldErrors<TFieldValues>
}

/** Shared code/description/materializationPolicy/contentSpecification fields
 * rendered by every stimulus editor. */
export function BaseStimulusFields<TFieldValues extends BaseStimulusFormData>({
  register,
  control,
  errors,
}: BaseStimulusFieldsProps<TFieldValues>) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Stimulus Properties
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="stimulus-code">
            Code <span className="text-destructive">*</span>
          </Label>
          <Input
            id="stimulus-code"
            placeholder="e.g. s1, intro-text"
            {...register('code' as never)}
          />
          {errors.code && (
            <p className="text-xs text-destructive">
              {String(errors.code.message ?? '')}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stimulus-desc">
            Description <span className="text-destructive">*</span>
          </Label>
          <Input
            id="stimulus-desc"
            placeholder="Brief label"
            {...register('description' as never)}
          />
          {errors.description && (
            <p className="text-xs text-destructive">
              {String(errors.description.message ?? '')}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Materialization Policy</Label>
        <Controller
          name={'materializationPolicy' as never}
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fixed">
                  Fixed (content set once, at authoring time)
                </SelectItem>
                <SelectItem value="Adaptable">
                  Adaptable (base content, may vary per delivery)
                </SelectItem>
                <SelectItem value="SpecificationBased">
                  Specification-based (generated from a spec)
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="stimulus-content-spec">Content Specification</Label>
        <Textarea
          id="stimulus-content-spec"
          placeholder="Required for Adaptable/Specification-based stimuli — describes how content should be produced."
          {...register('contentSpecification' as never)}
        />
      </div>
    </div>
  )
}

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import type { StimulusDraft } from '@/features/questions/types/stimulusDraft'
import type { TextStimulus } from '@/domain/qd/model'
import {
  textStimulusSchema,
  type TextStimulusFormData,
} from '@/features/questions/validation/stimulusSchemas'
import { BaseStimulusFields } from './BaseStimulusFields'

interface TextStimulusEditorProps {
  stimulus: StimulusDraft
  onSave: (updated: StimulusDraft) => void
  onClose: () => void
}

export function TextStimulusEditor({
  stimulus,
  onSave,
  onClose,
}: TextStimulusEditorProps) {
  const text = stimulus.type === 'Text' ? stimulus : undefined

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TextStimulusFormData>({
    resolver: zodResolver(textStimulusSchema),
    defaultValues: {
      code: stimulus.code,
      description: stimulus.description,
      materializationPolicy: stimulus.materializationPolicy ?? 'Fixed',
      contentSpecification: stimulus.contentSpecification ?? '',
      content: text?.content ?? '',
    },
  })

  const onSubmit = (data: TextStimulusFormData) => {
    const updated: TextStimulus = {
      id: stimulus.id,
      type: 'Text',
      code: data.code,
      description: data.description,
      materializationPolicy: data.materializationPolicy,
      contentSpecification: data.contentSpecification || undefined,
      content: data.content || undefined,
    }
    onSave(updated)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Content */}
      <div className="space-y-1.5">
        <Label htmlFor="text-content">
          Content
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            (optional — may be set during realization)
          </span>
        </Label>
        <Textarea
          id="text-content"
          rows={6}
          placeholder="Leave empty to set content later…"
          {...register('content')}
        />
      </div>

      <Separator />
      <BaseStimulusFields
        register={register}
        control={control}
        errors={errors}
      />

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Stimulus</Button>
      </div>
    </form>
  )
}

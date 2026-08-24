import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { StimulusDraft } from '@/features/questions/types/stimulusDraft'
import type { ImageStimulus } from '@/domain/qd/model'
import {
  imageStimulusSchema,
  type ImageStimulusFormData,
} from '@/features/questions/validation/stimulusSchemas'
import { BaseStimulusFields } from './BaseStimulusFields'

interface ImageStimulusEditorProps {
  stimulus: StimulusDraft
  onSave: (updated: StimulusDraft) => void
  onClose: () => void
}

export function ImageStimulusEditor({
  stimulus,
  onSave,
  onClose,
}: ImageStimulusEditorProps) {
  const image = stimulus.type === 'Image' ? stimulus : undefined
  const [source, setSource] = useState<string | undefined>(image?.source)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ImageStimulusFormData>({
    resolver: zodResolver(imageStimulusSchema),
    defaultValues: {
      code: stimulus.code,
      description: stimulus.description,
      materializationPolicy: stimulus.materializationPolicy ?? 'Fixed',
      contentSpecification: stimulus.contentSpecification ?? '',
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setSource(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const onSubmit = (data: ImageStimulusFormData) => {
    const updated: ImageStimulus = {
      id: stimulus.id,
      type: 'Image',
      code: data.code,
      description: data.description,
      materializationPolicy: data.materializationPolicy,
      contentSpecification: data.contentSpecification || undefined,
      source,
    }
    onSave(updated)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Image preview / upload */}
      <div className="space-y-2">
        <Label>Image</Label>
        {source ? (
          <div className="relative w-fit">
            <img
              src={source}
              alt="Stimulus preview"
              className="max-h-48 rounded-md border border-border object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6"
              onClick={() => setSource(undefined)}
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50">
            <Upload className="size-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Click to upload an image
            </span>
            <span className="text-xs text-muted-foreground">
              PNG, JPG, SVG, WebP
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        )}
        {!source && (
          <p className="text-xs text-muted-foreground">
            Image is optional — content can be set during realization.
          </p>
        )}
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

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Video, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import type { StimulusDraft } from '@/features/questions/types/stimulusDraft'
import type { VideoStimulus } from '@/domain/qd/model'
import {
  videoStimulusSchema,
  type VideoStimulusFormData,
} from '@/features/questions/validation/stimulusSchemas'
import { BaseStimulusFields } from './BaseStimulusFields'

interface VideoStimulusEditorProps {
  stimulus: StimulusDraft
  onSave: (updated: StimulusDraft) => void
  onClose: () => void
}

export function VideoStimulusEditor({
  stimulus,
  onSave,
  onClose,
}: VideoStimulusEditorProps) {
  const video = stimulus.type === 'Video' ? stimulus : undefined
  const [source, setSource] = useState<string | undefined>(video?.source)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<VideoStimulusFormData>({
    resolver: zodResolver(videoStimulusSchema),
    defaultValues: {
      code: stimulus.code,
      description: stimulus.description,
      materializationPolicy: stimulus.materializationPolicy ?? 'Fixed',
      contentSpecification: stimulus.contentSpecification ?? '',
      transcript: video?.transcript ?? '',
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setSource(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const onSubmit = (data: VideoStimulusFormData) => {
    const updated: VideoStimulus = {
      id: stimulus.id,
      type: 'Video',
      code: data.code,
      description: data.description,
      materializationPolicy: data.materializationPolicy,
      contentSpecification: data.contentSpecification || undefined,
      source,
      transcript: data.transcript || undefined,
    }
    onSave(updated)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label>Video File</Label>
        {source ? (
          <div className="flex items-start gap-3">
            <video
              controls
              src={source}
              className="max-h-40 flex-1 rounded-md border border-border"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setSource(undefined)}
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50">
            <Video className="size-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Click to upload video
            </span>
            <span className="text-xs text-muted-foreground">
              MP4, WebM, MOV
            </span>
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        )}
        {!source && (
          <p className="text-xs text-muted-foreground">
            Video is optional — can be set during realization.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="video-transcript">Transcript</Label>
        <Textarea
          id="video-transcript"
          rows={3}
          placeholder="Optional transcript for accessibility…"
          {...register('transcript')}
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

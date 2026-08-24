import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { BaseInteractionEditor } from './BaseInteractionEditor'
import {
  artifactSubmissionSchema,
  type ArtifactSubmissionFormData,
} from '@/features/questions/validation/interactionSchemas'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import type { ArtifactSubmission } from '@/domain/qd/model'

interface ArtifactSubmissionEditorProps {
  interaction: InteractionDraft
  onSave: (updated: InteractionDraft) => void
  onClose: () => void
}

export function ArtifactSubmissionEditor({
  interaction,
  onSave,
  onClose,
}: ArtifactSubmissionEditorProps) {
  const artifact =
    interaction.type === 'ArtifactSubmission' ? interaction : undefined

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ArtifactSubmissionFormData>({
    resolver: zodResolver(artifactSubmissionSchema),
    defaultValues: {
      code: interaction.code,
      instruction: interaction.instruction ?? '',
      minArtifacts: String(artifact?.minArtifacts ?? 1),
      maxArtifacts: artifact?.maxArtifacts?.toString() ?? '',
      artifactSpecification: artifact?.artifactSpecification ?? '',
    },
  })

  const onSubmit = (data: ArtifactSubmissionFormData) => {
    const updated: ArtifactSubmission = {
      id: interaction.id,
      type: 'ArtifactSubmission',
      code: data.code,
      instruction: data.instruction,
      minArtifacts: Number(data.minArtifacts),
      maxArtifacts:
        data.maxArtifacts === '' || data.maxArtifacts === undefined
          ? undefined
          : Number(data.maxArtifacts),
      artifactSpecification: data.artifactSpecification,
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="art-min">Min Artifacts</Label>
          <Input
            id="art-min"
            type="number"
            min={1}
            {...register('minArtifacts')}
          />
          {errors.minArtifacts && (
            <p className="text-xs text-destructive">
              {String(errors.minArtifacts.message ?? '')}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="art-max">Max Artifacts</Label>
          <Input
            id="art-max"
            type="number"
            min={1}
            placeholder="Optional"
            {...register('maxArtifacts')}
          />
          {errors.maxArtifacts && (
            <p className="text-xs text-destructive">
              {String(errors.maxArtifacts.message ?? '')}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="art-spec">Artifact Specification</Label>
        <Textarea
          id="art-spec"
          placeholder="e.g. A PDF file no larger than 10MB."
          {...register('artifactSpecification')}
        />
        {errors.artifactSpecification && (
          <p className="text-xs text-destructive">
            {String(errors.artifactSpecification.message ?? '')}
          </p>
        )}
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

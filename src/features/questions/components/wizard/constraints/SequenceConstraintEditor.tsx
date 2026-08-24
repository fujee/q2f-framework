import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  sequenceConstraintSchema,
  type SequenceConstraintFormData,
} from '@/features/questions/validation/constraintSchemas'
import type {
  ConstraintDraft,
  SequenceConstraint,
} from '@/features/questions/types/constraintDraft'
import { useQuestionEditorStore } from '@/features/questions/store/questionEditorStore'
import { INTERACTION_TYPE_MAP } from '@/lib/interactionTypes'

interface SequenceConstraintEditorProps {
  constraint: ConstraintDraft
  onSave: (updated: ConstraintDraft) => void
  onClose: () => void
}

export function SequenceConstraintEditor({
  constraint,
  onSave,
  onClose,
}: SequenceConstraintEditorProps) {
  const interactions = useQuestionEditorStore(
    (s) => s.draft.responseInteractions
  )
  const sequence = constraint.type === 'Sequence' ? constraint : undefined
  const [interactionRefs, setInteractionRefs] = useState<string[]>(
    sequence?.interactionRefs ?? []
  )
  const [refsError, setRefsError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SequenceConstraintFormData>({
    resolver: zodResolver(sequenceConstraintSchema),
    defaultValues: {
      description: constraint.description ?? '',
      strength: constraint.strength ?? 'Required',
      interactionRefs: sequence?.interactionRefs ?? [],
    },
  })

  const toggleInteraction = (id: string) => {
    setInteractionRefs((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const moveRef = (index: number, dir: 'up' | 'down') => {
    const next = [...interactionRefs]
    const [item] = next.splice(index, 1)
    next.splice(dir === 'up' ? index - 1 : index + 1, 0, item)
    setInteractionRefs(next)
  }

  const onSubmit = (data: SequenceConstraintFormData) => {
    if (interactionRefs.length < 2) {
      setRefsError('Select at least two interactions.')
      return
    }
    setRefsError(null)
    const updated: SequenceConstraint = {
      id: constraint.id,
      type: 'Sequence',
      description: data.description || undefined,
      strength: data.strength,
      interactionRefs,
    }
    onSave(updated)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="sc-desc">Description</Label>
        <Textarea
          id="sc-desc"
          rows={2}
          placeholder="Describe what this constraint enforces… (optional)"
          autoFocus
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Interactions in Sequence</Label>
        {interactions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No interactions defined yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {interactions.map((ia) => (
              <button
                key={ia.id}
                type="button"
                onClick={() => toggleInteraction(ia.id)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  interactionRefs.includes(ia.id)
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-muted'
                }`}
              >
                {ia.code}
              </button>
            ))}
          </div>
        )}
        {interactionRefs.length >= 2 && (
          <ol className="space-y-1.5">
            {interactionRefs.map((ref, i) => {
              const ia = interactions.find((x) => x.id === ref)
              return (
                <li
                  key={ref}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5"
                >
                  <span className="w-5 text-center text-xs tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">
                    {ia
                      ? `${ia.code} (${INTERACTION_TYPE_MAP[ia.type].label})`
                      : ref}
                  </span>
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === 0}
                      onClick={() => moveRef(i, 'up')}
                    >
                      <ChevronUp className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === interactionRefs.length - 1}
                      onClick={() => moveRef(i, 'down')}
                    >
                      <ChevronDown className="size-3" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        {refsError && <p className="text-xs text-destructive">{refsError}</p>}
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label>Strength</Label>
        <Controller
          name="strength"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Required">Required</SelectItem>
                <SelectItem value="Preferred">Preferred</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Constraint</Button>
      </div>
    </form>
  )
}

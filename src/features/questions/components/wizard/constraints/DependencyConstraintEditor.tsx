import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
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
  dependencyConstraintSchema,
  type DependencyConstraintFormData,
} from '@/features/questions/validation/constraintSchemas'
import type {
  ConstraintDraft,
  DependencyConstraint,
} from '@/features/questions/types/constraintDraft'
import { useQuestionEditorStore } from '@/features/questions/store/questionEditorStore'
import { INTERACTION_TYPE_MAP } from '@/lib/interactionTypes'

interface DependencyConstraintEditorProps {
  constraint: ConstraintDraft
  onSave: (updated: ConstraintDraft) => void
  onClose: () => void
}

export function DependencyConstraintEditor({
  constraint,
  onSave,
  onClose,
}: DependencyConstraintEditorProps) {
  const interactions = useQuestionEditorStore(
    (s) => s.draft.responseInteractions
  )
  const dependency = constraint.type === 'Dependency' ? constraint : undefined

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DependencyConstraintFormData>({
    resolver: zodResolver(dependencyConstraintSchema),
    defaultValues: {
      description: constraint.description ?? '',
      strength: constraint.strength ?? 'Required',
      predecessorInteractionRef: dependency?.predecessorInteractionRef ?? '',
      successorInteractionRef: dependency?.successorInteractionRef ?? '',
      rule: dependency?.rule ?? 'RequiresCompletion',
    },
  })

  const onSubmit = (data: DependencyConstraintFormData) => {
    const updated: DependencyConstraint = {
      id: constraint.id,
      type: 'Dependency',
      description: data.description || undefined,
      strength: data.strength,
      predecessorInteractionRef: data.predecessorInteractionRef,
      successorInteractionRef: data.successorInteractionRef,
      rule: data.rule,
    }
    onSave(updated)
  }

  if (!interactions.length) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            No interactions are defined yet. Go back to Step 3 and add
            interactions before creating a Dependency constraint.
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="dc-desc">Description</Label>
        <Textarea
          id="dc-desc"
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Predecessor Interaction</Label>
          <Controller
            name="predecessorInteractionRef"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interaction…" />
                </SelectTrigger>
                <SelectContent>
                  {interactions.map((ia) => {
                    const meta = INTERACTION_TYPE_MAP[ia.type]
                    return (
                      <SelectItem key={ia.id} value={ia.id}>
                        {ia.code} ({meta.label})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          />
          {errors.predecessorInteractionRef && (
            <p className="text-xs text-destructive">
              {errors.predecessorInteractionRef.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Successor Interaction</Label>
          <Controller
            name="successorInteractionRef"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interaction…" />
                </SelectTrigger>
                <SelectContent>
                  {interactions.map((ia) => {
                    const meta = INTERACTION_TYPE_MAP[ia.type]
                    return (
                      <SelectItem key={ia.id} value={ia.id}>
                        {ia.code} ({meta.label})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          />
          {errors.successorInteractionRef && (
            <p className="text-xs text-destructive">
              {errors.successorInteractionRef.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Strength</Label>
          <Controller
            name="strength"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
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

        <div className="space-y-1.5">
          <Label>Rule</Label>
          <Controller
            name="rule"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RequiresCompletion">
                    Requires completion
                  </SelectItem>
                  <SelectItem value="RequiresCorrectness">
                    Requires correctness
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
        <Button type="submit">Save Constraint</Button>
      </div>
    </form>
  )
}

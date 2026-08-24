import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateCategorization } from '../hooks/useCategorizations'
import {
  categorizationSchema,
  type CategorizationFormData,
} from '../validation/categorizationSchemas'

interface CreateCategorizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the new categorization's name after successful creation. */
  onCreated?: (name: string) => void
}

export function CreateCategorizationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCategorizationDialogProps) {
  const { mutate, isPending } = useCreateCategorization()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategorizationFormData>({
    resolver: zodResolver(categorizationSchema),
    defaultValues: { name: '', isExclusive: true },
  })

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const isExclusive = watch('isExclusive')

  const onSubmit = (data: CategorizationFormData) => {
    mutate(data, {
      onSuccess: (created) => {
        onOpenChange(false)
        onCreated?.(created.name)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Categorization</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-cat-name">Name</Label>
            <Input
              id="create-cat-name"
              placeholder="e.g. Subject, Difficulty, Grade"
              autoFocus
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex items-start gap-3">
            <input
              id="create-cat-exclusive"
              type="checkbox"
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border accent-primary"
              checked={isExclusive}
              onChange={(e) => setValue('isExclusive', e.target.checked)}
            />
            <div>
              <Label htmlFor="create-cat-exclusive" className="cursor-pointer">
                Exclusive
              </Label>
              <p className="text-xs text-muted-foreground">
                A question may belong to at most one category in this
                categorization.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

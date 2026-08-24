import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { STIMULUS_TYPE_MAP } from '@/lib/stimulusTypes'
import type { StimulusDraft } from '@/features/questions/types/stimulusDraft'

interface StimulusCardProps {
  stimulus: StimulusDraft
  index: number
  onEdit: () => void
  onDelete: () => void
}

export function StimulusCard({
  stimulus,
  index,
  onEdit,
  onDelete,
}: StimulusCardProps) {
  const meta = STIMULUS_TYPE_MAP[stimulus.type]
  const Icon = meta.icon

  const hasContent =
    stimulus.type === 'Text'
      ? stimulus.content !== undefined
      : stimulus.source !== undefined

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      {/* Icon */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {stimulus.code}
          </span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {meta.label}
          </span>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-xs',
              hasContent
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
            )}
          >
            {hasContent ? 'Content set' : 'No content yet'}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {stimulus.description}
        </p>
      </div>

      {/* Position + actions */}
      <div className="flex shrink-0 items-center gap-1">
        <span className="mr-1 text-xs tabular-nums text-muted-foreground">
          #{index + 1}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit stimulus</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete stimulus</span>
        </Button>
      </div>
    </div>
  )
}

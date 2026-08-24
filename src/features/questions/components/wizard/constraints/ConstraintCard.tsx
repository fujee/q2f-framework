import { Pencil, Trash2 } from 'lucide-react'
import { ArrowDownUp, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ConstraintDraft } from '@/features/questions/types/constraintDraft'
import { useQuestionEditorStore } from '@/features/questions/store/questionEditorStore'
import { INTERACTION_TYPE_MAP } from '@/lib/interactionTypes'
import type { ResponseInteraction } from '@/domain/qd/model'

const TYPE_ICON = {
  Sequence: ArrowDownUp,
  Dependency: GitBranch,
} as const

const TYPE_LABEL = {
  Sequence: 'Sequence',
  Dependency: 'Dependency',
} as const

function getSummary(
  c: ConstraintDraft,
  interactions: ResponseInteraction[]
): string {
  if (c.type === 'Sequence') {
    const codes = c.interactionRefs.map(
      (ref) => interactions.find((i) => i.id === ref)?.code ?? '?'
    )
    return `${codes.join(' → ')} · ${c.strength}`
  }
  const pred = interactions.find((i) => i.id === c.predecessorInteractionRef)
  const succ = interactions.find((i) => i.id === c.successorInteractionRef)
  const predLabel = pred
    ? `${pred.code} (${INTERACTION_TYPE_MAP[pred.type].label})`
    : '?'
  const succLabel = succ
    ? `${succ.code} (${INTERACTION_TYPE_MAP[succ.type].label})`
    : '?'
  return `${predLabel} → ${succLabel} · ${c.rule} · ${c.strength}`
}

interface ConstraintCardProps {
  constraint: ConstraintDraft
  index: number
  onEdit: () => void
  onDelete: () => void
}

export function ConstraintCard({
  constraint,
  index,
  onEdit,
  onDelete,
}: ConstraintCardProps) {
  const interactions = useQuestionEditorStore(
    (s) => s.draft.responseInteractions
  )
  const Icon = TYPE_ICON[constraint.type]
  const summary = getSummary(constraint, interactions)

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {TYPE_LABEL[constraint.type]}
          </span>
          {constraint.description && (
            <span className="truncate text-sm font-medium text-foreground">
              {constraint.description}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {summary}
        </p>
      </div>
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
          <span className="sr-only">Edit constraint</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete constraint</span>
        </Button>
      </div>
    </div>
  )
}

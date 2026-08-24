import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { INTERACTION_TYPE_MAP } from '@/lib/interactionTypes'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'

interface InteractionCardProps {
  interaction: InteractionDraft
  index: number
  onEdit: () => void
  onDelete: () => void
}

function getSummary(interaction: InteractionDraft): string {
  switch (interaction.type) {
    case 'Selecting':
      return `${interaction.choices.length} choices · ${interaction.minSelections}-${interaction.maxSelections} selections`
    case 'Ordering':
      return `${interaction.orderingItems.length} items`
    case 'Completing': {
      const gapCount = interaction.completingGaps.length
      const itemCount = interaction.completingItems.length
      return itemCount > 0
        ? `${gapCount} gaps · ${itemCount} items`
        : `${gapCount} gaps`
    }
    case 'ArtifactSubmission':
      return `${interaction.minArtifacts}-${interaction.maxArtifacts ?? '∞'} artifacts`
    case 'ShortInput':
      return interaction.inputType
    case 'Essay':
      return interaction.maxLength
        ? `Max ${interaction.maxLength} ${interaction.lengthUnit?.toLowerCase() ?? ''}`
        : 'No limit'
    case 'Relating': {
      const relCount = interaction.correctRelations.length
      return `${interaction.sourceSet.relatingElements.length} × ${interaction.targetSet.relatingElements.length} elements · ${relCount} relations`
    }
    case 'Marking':
      return `${interaction.markType} · surface via association`
    default:
      return ''
  }
}

export function InteractionCard({
  interaction,
  index,
  onEdit,
  onDelete,
}: InteractionCardProps) {
  const meta = INTERACTION_TYPE_MAP[interaction.type]
  const Icon = meta.icon
  const summary = getSummary(interaction)

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {interaction.code}
          </span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {meta.label}
          </span>
        </div>
        {summary && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {summary}
          </p>
        )}
        {interaction.instruction && (
          <div
            className="rich-text-content mt-0.5 text-xs text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: interaction.instruction }}
          />
        )}
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
          <span className="sr-only">Edit interaction</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete interaction</span>
        </Button>
      </div>
    </div>
  )
}

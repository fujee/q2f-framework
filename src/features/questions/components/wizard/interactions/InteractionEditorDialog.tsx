import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { INTERACTION_TYPE_MAP } from '@/lib/interactionTypes'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import { interactionEditorRegistry } from './interactionEditorRegistry'

interface InteractionEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interaction: InteractionDraft
  onSave: (updated: InteractionDraft) => void
}

export function InteractionEditorDialog({
  open,
  onOpenChange,
  interaction,
  onSave,
}: InteractionEditorDialogProps) {
  const meta = INTERACTION_TYPE_MAP[interaction.type]
  const Icon = meta.icon
  const Editor = interactionEditorRegistry[interaction.type]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[85vh] overflow-y-auto',
          interaction.type === 'Completing' ? 'max-w-6xl' : 'max-w-4xl'
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-5 text-muted-foreground" />
            {meta.label} Interaction
          </DialogTitle>
        </DialogHeader>
        <Editor
          interaction={interaction}
          onSave={(updated) => {
            onSave(updated)
            onOpenChange(false)
          }}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

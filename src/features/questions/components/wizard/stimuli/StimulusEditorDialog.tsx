import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { STIMULUS_TYPE_MAP } from '@/lib/stimulusTypes'
import type { StimulusDraft } from '@/features/questions/types/stimulusDraft'
import { stimulusEditorRegistry } from './stimulusEditorRegistry'

interface StimulusEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stimulus: StimulusDraft
  onSave: (updated: StimulusDraft) => void
}

export function StimulusEditorDialog({
  open,
  onOpenChange,
  stimulus,
  onSave,
}: StimulusEditorDialogProps) {
  const meta = STIMULUS_TYPE_MAP[stimulus.type]
  const Icon = meta.icon
  const Editor = stimulusEditorRegistry[stimulus.type]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-5 text-muted-foreground" />
            {meta.label} Stimulus
          </DialogTitle>
        </DialogHeader>
        <Editor
          stimulus={stimulus}
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

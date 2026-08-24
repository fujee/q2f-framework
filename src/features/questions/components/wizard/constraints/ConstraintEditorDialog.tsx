import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowDownUp, GitBranch } from 'lucide-react'
import type {
  ConstraintDraft,
  ConstraintType,
} from '@/features/questions/types/constraintDraft'
import { SequenceConstraintEditor } from './SequenceConstraintEditor'
import { DependencyConstraintEditor } from './DependencyConstraintEditor'

const TYPE_ICON = { Sequence: ArrowDownUp, Dependency: GitBranch } as const
const TYPE_LABEL = { Sequence: 'Sequence', Dependency: 'Dependency' } as const

interface ConstraintEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  constraint: ConstraintDraft
  onSave: (updated: ConstraintDraft) => void
}

export function ConstraintEditorDialog({
  open,
  onOpenChange,
  constraint,
  onSave,
}: ConstraintEditorDialogProps) {
  const Icon = TYPE_ICON[constraint.type as ConstraintType]

  const Editor =
    constraint.type === 'Sequence'
      ? SequenceConstraintEditor
      : DependencyConstraintEditor

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-5 text-muted-foreground" />
            {TYPE_LABEL[constraint.type as ConstraintType]} Constraint
          </DialogTitle>
        </DialogHeader>
        <Editor
          constraint={constraint}
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

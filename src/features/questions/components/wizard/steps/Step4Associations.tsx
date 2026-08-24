import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssociationMatrix } from '../associations/AssociationMatrix'
import { useQuestionEditorStore } from '@/features/questions/store/questionEditorStore'

interface Step4AssociationsProps {
  onPrev: () => void
  onNext: () => void
}

export function Step4Associations({ onPrev, onNext }: Step4AssociationsProps) {
  const { draft } = useQuestionEditorStore()
  const count = draft.interactionStimulusAssociations.length

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Associations</p>
        <p className="text-xs text-muted-foreground">
          Check a cell to link a stimulus to an interaction. Set the link role
          to <strong>Context</strong> (supportive reference material) or{' '}
          <strong>Workspace</strong> (the surface the interaction operates on).
          {count > 0 && (
            <span className="ml-1 font-medium text-foreground">
              {count} association{count !== 1 ? 's' : ''} defined.
            </span>
          )}
        </p>
      </div>

      <AssociationMatrix />

      <div className="flex justify-between border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button type="button" onClick={onNext}>
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { useQuestionEditorStore } from '@/features/questions/store/questionEditorStore'
import { ConstraintCard } from '../constraints/ConstraintCard'
import { ConstraintEditorDialog } from '../constraints/ConstraintEditorDialog'
import type {
  ConstraintDraft,
  ConstraintType,
} from '@/features/questions/types/constraintDraft'

interface Step5ConstraintsProps {
  onPrev: () => void
  onNext: () => void
}

function createDefaultDraft(type: ConstraintType): ConstraintDraft {
  const id = crypto.randomUUID()
  if (type === 'Sequence') {
    return {
      id,
      type: 'Sequence',
      description: '',
      strength: 'Required',
      interactionRefs: [],
    }
  }
  return {
    id,
    type: 'Dependency',
    description: '',
    strength: 'Required',
    predecessorInteractionRef: '',
    successorInteractionRef: '',
    rule: 'RequiresCompletion',
  }
}

export function Step5Constraints({ onPrev, onNext }: Step5ConstraintsProps) {
  const { draft, addConstraint, updateConstraint, removeConstraint } =
    useQuestionEditorStore()
  const constraints = draft.constraints

  const [editingDraft, setEditingDraft] = useState<ConstraintDraft | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAddType = (type: ConstraintType) =>
    setEditingDraft(createDefaultDraft(type))

  const handleSave = (updated: ConstraintDraft) => {
    const isNew = !constraints.some((c) => c.id === updated.id)
    if (isNew) addConstraint(updated)
    else updateConstraint(updated.id, updated)
    setEditingDraft(null)
  }

  const deletingConstraint = constraints.find((c) => c.id === deletingId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Constraints</p>
          <p className="text-xs text-muted-foreground">
            Define ordering and dependency rules between interactions.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Add Constraint
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleAddType('Sequence')}>
              Sequence constraint
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddType('Dependency')}>
              Dependency constraint
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {constraints.length > 0 ? (
        <div className="space-y-2">
          {constraints.map((c, i) => (
            <ConstraintCard
              key={c.id}
              constraint={c}
              index={i}
              onEdit={() => setEditingDraft(c)}
              onDelete={() => setDeletingId(c.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="No constraints yet"
          description="Add sequence or dependency constraints to control how interactions must be answered."
        />
      )}

      <div className="flex justify-between border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ChevronLeft className="size-4" /> Previous
        </Button>
        <Button type="button" onClick={onNext}>
          Next <ChevronRight className="size-4" />
        </Button>
      </div>

      {editingDraft && (
        <ConstraintEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingDraft(null)
          }}
          constraint={editingDraft}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
        title={`Delete constraint "${deletingConstraint?.description || '(unnamed)'}"?`}
        description="This will permanently remove the constraint."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deletingId) {
            removeConstraint(deletingId)
            setDeletingId(null)
          }
        }}
      />
    </div>
  )
}

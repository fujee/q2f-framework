import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Layers } from 'lucide-react'
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
import { StimulusCard } from '../stimuli/StimulusCard'
import { StimulusEditorDialog } from '../stimuli/StimulusEditorDialog'
import type { StimulusDraft } from '@/features/questions/types/stimulusDraft'
import type { StimulusType } from '@/domain/qd/model'
import { STIMULUS_TYPES } from '@/lib/stimulusTypes'

interface Step2StimuliProps {
  onPrev: () => void
  onNext: () => void
}

function createDefaultDraft(type: StimulusType, count: number): StimulusDraft {
  const base = {
    id: crypto.randomUUID(),
    code: `s${count + 1}`,
    description: '',
    materializationPolicy: 'Fixed' as const,
  }
  if (type === 'Text') return { ...base, type: 'Text' }
  if (type === 'Image') return { ...base, type: 'Image' }
  if (type === 'Audio') return { ...base, type: 'Audio' }
  return { ...base, type: 'Video' }
}

export function Step2Stimuli({ onPrev, onNext }: Step2StimuliProps) {
  const { draft, addStimulus, updateStimulus, removeStimulus } =
    useQuestionEditorStore()

  const [editingDraft, setEditingDraft] = useState<StimulusDraft | null>(null)
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null)

  const handleAddType = (type: StimulusType) => {
    const newDraft = createDefaultDraft(type, draft.stimuli.length)
    setEditingDraft(newDraft)
  }

  const handleSave = (updated: StimulusDraft) => {
    const isNew = !draft.stimuli.some((s) => s.id === updated.id)
    if (isNew) {
      addStimulus(updated)
    } else {
      updateStimulus(updated.id, updated)
    }
    setEditingDraft(null)
  }

  const handleConfirmDelete = () => {
    if (deletingDraftId) {
      removeStimulus(deletingDraftId)
      setDeletingDraftId(null)
    }
  }

  const deletingStimulus = draft.stimuli.find((s) => s.id === deletingDraftId)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Stimuli</p>
          <p className="text-xs text-muted-foreground">
            Add resources (text, image, audio, video) that respondents use while
            answering. Content can be left empty and filled during realization.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              Add Stimulus
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STIMULUS_TYPES.map(({ type, label, icon: Icon }) => (
              <DropdownMenuItem key={type} onClick={() => handleAddType(type)}>
                <Icon className="size-4" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* List */}
      {draft.stimuli.length > 0 ? (
        <div className="space-y-2">
          {draft.stimuli.map((s, i) => (
            <StimulusCard
              key={s.id}
              stimulus={s}
              index={i}
              onEdit={() => setEditingDraft(s)}
              onDelete={() => setDeletingDraftId(s.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Layers}
          title="No stimuli yet"
          description="Add text, image, audio, or video resources for this question."
        />
      )}

      {/* Navigation */}
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

      {/* Stimulus editor dialog */}
      {editingDraft && (
        <StimulusEditorDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingDraft(null)
          }}
          stimulus={editingDraft}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deletingDraftId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingDraftId(null)
        }}
        title={`Delete stimulus "${deletingStimulus?.code}"?`}
        description="This will remove the stimulus from the question."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

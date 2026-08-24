import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MousePointerClick,
} from 'lucide-react'
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
import { InteractionCard } from '../interactions/InteractionCard'
import { InteractionEditorDialog } from '../interactions/InteractionEditorDialog'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import type { ResponseInteractionType } from '@/domain/qd/model'
import { INTERACTION_TYPES } from '@/lib/interactionTypes'

interface Step3InteractionsProps {
  onPrev: () => void
  onNext: () => void
}

function createDefaultDraft(
  type: ResponseInteractionType,
  count: number
): InteractionDraft {
  const id = crypto.randomUUID()
  const code = `i${count + 1}`
  switch (type) {
    case 'Selecting':
      return {
        id,
        code,
        type,
        choices: [
          { id: crypto.randomUUID(), code: 'a', name: '', isCorrect: true },
          { id: crypto.randomUUID(), code: 'b', name: '', isCorrect: false },
        ],
        minSelections: 1,
        maxSelections: 1,
        itemOrderPolicy: 'Permutable',
      }
    case 'Ordering': {
      const item1 = crypto.randomUUID()
      const item2 = crypto.randomUUID()
      return {
        id,
        code,
        type,
        orderingItems: [
          { id: item1, code: 'item1', name: '' },
          { id: item2, code: 'item2', name: '' },
        ],
        correctOrder: [item1, item2],
        itemOrderPolicy: 'Fixed',
      }
    }
    case 'Completing':
      return {
        id,
        code,
        type,
        completingItems: [],
        completingGaps: [
          {
            id: crypto.randomUUID(),
            code: 'g1',
            type: 'TextInputGap',
            anchor: { kind: 'TextAnchor', marker: '{{g1}}' },
            correctValues: [],
            caseSensitive: false,
            trimWhitespace: true,
          },
        ],
      }
    case 'Marking':
      return { id, code, type, markType: 'Point', minMarks: 1, maxMarks: 1 }
    case 'ShortInput':
      return {
        id,
        code,
        type,
        inputType: 'Text',
        correctValues: [],
        caseSensitive: false,
        trimWhitespace: true,
      }
    case 'Essay':
      return { id, code, type }
    case 'ArtifactSubmission':
      return { id, code, type, minArtifacts: 1, artifactSpecification: '' }
    case 'Relating':
      return {
        id,
        code,
        type,
        mappingType: 'OneToOne',
        sourceParticipationPolicy: 'Optional',
        sourceSet: {
          code: 'set-a',
          name: 'Set A',
          elementOrderPolicy: 'Permutable',
          relatingElements: [],
        },
        targetSet: {
          code: 'set-b',
          name: 'Set B',
          elementOrderPolicy: 'Permutable',
          relatingElements: [],
        },
        correctRelations: [],
      }
  }
}

export function Step3Interactions({ onPrev, onNext }: Step3InteractionsProps) {
  const { draft, addInteraction, updateInteraction, removeInteraction } =
    useQuestionEditorStore()
  const interactions = draft.responseInteractions

  const [editingDraft, setEditingDraft] = useState<InteractionDraft | null>(
    null
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAddType = (type: ResponseInteractionType) => {
    setEditingDraft(createDefaultDraft(type, interactions.length))
  }

  const handleSave = (updated: InteractionDraft) => {
    const isNew = !interactions.some((i) => i.id === updated.id)
    if (isNew) addInteraction(updated)
    else updateInteraction(updated.id, updated)
    setEditingDraft(null)
  }

  const handleConfirmDelete = () => {
    if (deletingId) {
      removeInteraction(deletingId)
      setDeletingId(null)
    }
  }

  const deletingInteraction = interactions.find((i) => i.id === deletingId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Interactions</p>
          <p className="text-xs text-muted-foreground">
            Define how respondents engage with this question.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Add Interaction
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {INTERACTION_TYPES.map(({ type, label, icon: Icon }) => (
              <DropdownMenuItem key={type} onClick={() => handleAddType(type)}>
                <Icon className="size-4" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {interactions.length > 0 ? (
        <div className="space-y-2">
          {interactions.map((ia, i) => (
            <InteractionCard
              key={ia.id}
              interaction={ia}
              index={i}
              onEdit={() => setEditingDraft(ia)}
              onDelete={() => setDeletingId(ia.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MousePointerClick}
          title="No interactions yet"
          description="Add how respondents will answer — selecting, ordering, completing, and more."
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
        <InteractionEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingDraft(null)
          }}
          interaction={editingDraft}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
        title={`Delete interaction "${deletingInteraction?.code}"?`}
        description="This will remove the interaction from the question."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

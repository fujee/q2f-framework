import type { ComponentType } from 'react'
import type { InteractionDraft } from '@/features/questions/types/interactionDraft'
import type { ResponseInteractionType } from '@/domain/qd/model'
import { SelectingEditor } from './SelectingEditor'
import { OrderingEditor } from './OrderingEditor'
import { CompletingEditor } from './CompletingEditor'
import { MarkingEditor } from './MarkingEditor'
import { ShortInputEditor } from './ShortInputEditor'
import { EssayEditor } from './EssayEditor'
import { ArtifactSubmissionEditor } from './ArtifactSubmissionEditor'
import { RelatingEditor } from './RelatingEditor'

export interface InteractionEditorProps {
  interaction: InteractionDraft
  onSave: (updated: InteractionDraft) => void
  onClose: () => void
}

export const interactionEditorRegistry: Record<
  ResponseInteractionType,
  ComponentType<InteractionEditorProps>
> = {
  Selecting: SelectingEditor,
  Ordering: OrderingEditor,
  Completing: CompletingEditor,
  Marking: MarkingEditor,
  ShortInput: ShortInputEditor,
  Essay: EssayEditor,
  ArtifactSubmission: ArtifactSubmissionEditor,
  Relating: RelatingEditor,
}

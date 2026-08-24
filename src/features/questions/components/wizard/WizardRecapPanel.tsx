import type { ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuestionEditorStore } from '@/features/questions/store/questionEditorStore'
import { useCategorizations } from '@/features/categories/hooks/useCategorizations'
import { QuestionStatusBadge } from '@/features/questions/components/QuestionStatusBadge'

interface RecapSectionProps {
  title: string
  step: number
  currentStep: number
  isComplete: boolean
  onNavigate: (step: number) => void
  children: ReactNode
}

function RecapSection({
  title,
  step,
  currentStep,
  isComplete,
  onNavigate,
  children,
}: RecapSectionProps) {
  const isCurrent = step === currentStep
  const isAccessible = step <= currentStep
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-xs transition-colors',
        isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border'
      )}
    >
      <button
        type="button"
        disabled={!isAccessible}
        onClick={() => isAccessible && onNavigate(step)}
        className="mb-1.5 flex w-full items-center justify-between gap-1 disabled:cursor-default"
      >
        <span className="font-medium text-foreground">{title}</span>
        {isComplete ? (
          <Check className="size-3 text-green-600" />
        ) : (
          <Minus className="size-3 text-muted-foreground" />
        )}
      </button>
      <div className="text-muted-foreground">{children}</div>
    </div>
  )
}

interface WizardRecapPanelProps {
  onNavigate: (step: number) => void
}

export function WizardRecapPanel({ onNavigate }: WizardRecapPanelProps) {
  const { draft, currentStep } = useQuestionEditorStore()
  const { data: categorizations } = useCategorizations()

  const assignedCategoryNames =
    categorizations?.flatMap((cat) =>
      cat.categories
        .filter((c) => draft.categories.includes(c.id))
        .map((c) => c.name)
    ) ?? []

  const metadataComplete = draft.shortDescription.length > 0

  return (
    <aside className="w-52 shrink-0 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Summary
      </p>

      <RecapSection
        title="Metadata"
        step={1}
        currentStep={currentStep}
        isComplete={metadataComplete}
        onNavigate={onNavigate}
      >
        {draft.shortDescription ? (
          <>
            <div
              className="rich-text-content line-clamp-3 overflow-hidden text-ellipsis"
              dangerouslySetInnerHTML={{ __html: draft.shortDescription }}
            />
            <div className="mt-1">
              <QuestionStatusBadge status={draft.status} />
            </div>
          </>
        ) : (
          <p className="italic">Not set</p>
        )}
        {assignedCategoryNames.length > 0 && (
          <p className="mt-1">{assignedCategoryNames.join(', ')}</p>
        )}
      </RecapSection>

      <RecapSection
        title="Stimuli"
        step={2}
        currentStep={currentStep}
        isComplete={(draft.stimuli ?? []).length > 0}
        onNavigate={onNavigate}
      >
        {(draft.stimuli ?? []).length > 0 ? (
          <p>
            {draft.stimuli.length} stimulus
            {draft.stimuli.length !== 1 ? 'i' : ''}
          </p>
        ) : (
          <p className="italic">No stimuli yet</p>
        )}
      </RecapSection>

      <RecapSection
        title="Interactions"
        step={3}
        currentStep={currentStep}
        isComplete={draft.responseInteractions.length > 0}
        onNavigate={onNavigate}
      >
        {draft.responseInteractions.length > 0 ? (
          <p>
            {draft.responseInteractions.length} interaction
            {draft.responseInteractions.length !== 1 ? 's' : ''}
          </p>
        ) : (
          <p className="italic">No interactions yet</p>
        )}
      </RecapSection>

      <RecapSection
        title="Associations"
        step={4}
        currentStep={currentStep}
        isComplete={draft.interactionStimulusAssociations.length > 0}
        onNavigate={onNavigate}
      >
        {draft.interactionStimulusAssociations.length > 0 ? (
          <p>
            {draft.interactionStimulusAssociations.length} association
            {draft.interactionStimulusAssociations.length !== 1 ? 's' : ''}
          </p>
        ) : (
          <p className="italic">No associations yet</p>
        )}
      </RecapSection>

      <RecapSection
        title="Constraints"
        step={5}
        currentStep={currentStep}
        isComplete={(draft.constraints ?? []).length > 0}
        onNavigate={onNavigate}
      >
        {(draft.constraints ?? []).length > 0 ? (
          <p>
            {draft.constraints.length} constraint
            {draft.constraints.length !== 1 ? 's' : ''}
          </p>
        ) : (
          <p className="italic">No constraints yet</p>
        )}
      </RecapSection>
    </aside>
  )
}

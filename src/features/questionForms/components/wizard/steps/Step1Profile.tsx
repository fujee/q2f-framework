import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useQuestionFormEditorStore } from '../../../store/questionFormEditorStore'
import { PROFILE_REGISTRY } from '@/domain/qfd/profiles/registry'
import type { ProfileId } from '@/domain/qfd/model'

const PROFILE_DESCRIPTIONS: Record<ProfileId, string> = {
  InteractiveWebProfile:
    'A rich interactive medium supporting all layout capabilities and most response mechanisms (drag/drop selection, direct manipulation, digital submissions).',
  ConventionalPaperProfile:
    'A static, printed medium. No digital submissions and no dynamic dependency enforcement; spatial placement is fixed at print time.',
}

interface Step1ProfileProps {
  onNext: () => void
}

export function Step1Profile({ onNext }: Step1ProfileProps) {
  const { draft, setTargetProfileRef } = useQuestionFormEditorStore()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium">Target Profile</p>
        <p className="text-xs text-muted-foreground">
          Choose the delivery medium this form definition will target. This
          determines which response mechanisms and layout capabilities are
          available in the next steps.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.values(PROFILE_REGISTRY).map((profile) => {
          const isSelected = draft.targetProfileRef === profile.id
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => setTargetProfileRef(profile.id)}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <p className="text-sm font-medium">{profile.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {PROFILE_DESCRIPTIONS[profile.id]}
              </p>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button onClick={onNext} className="gap-1.5">
          Next
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

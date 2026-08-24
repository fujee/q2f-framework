import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEP_LABELS = [
  'Metadata',
  'Stimuli',
  'Interactions',
  'Associations',
  'Constraints',
  'Review',
]

interface WizardStepNavProps {
  currentStep: number
  onStepClick: (step: number) => void
  labels?: string[]
}

export function WizardStepNav({
  currentStep,
  onStepClick,
  labels = STEP_LABELS,
}: WizardStepNavProps) {
  return (
    <nav aria-label="Wizard steps">
      <ol className="flex items-start gap-0">
        {labels.map((label, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const isClickable = stepNum <= currentStep

          return (
            <li key={stepNum} className="flex items-center">
              {/* Connector */}
              {stepNum > 1 && (
                <div
                  className={cn(
                    'h-px w-6 transition-colors',
                    stepNum <= currentStep ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}

              <button
                type="button"
                onClick={() => isClickable && onStepClick(stepNum)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'group flex flex-col items-center gap-1',
                  !isClickable && 'cursor-not-allowed opacity-40'
                )}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent &&
                      'bg-primary text-primary-foreground ring-2 ring-primary/20',
                    !isCompleted &&
                      !isCurrent &&
                      'border border-border bg-background text-muted-foreground',
                    isClickable &&
                      !isCurrent &&
                      !isCompleted &&
                      'group-hover:border-primary group-hover:text-primary'
                  )}
                >
                  {isCompleted ? <Check className="size-3.5" /> : stepNum}
                </div>
                <span
                  className={cn(
                    'hidden text-[10px] sm:block',
                    isCurrent
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

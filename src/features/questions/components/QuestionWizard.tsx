import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useQuestionEditorStore,
  WIZARD_STEP_COUNT,
} from '../store/questionEditorStore'
import { WizardStepNav } from './wizard/WizardStepNav'
import { WizardRecapPanel } from './wizard/WizardRecapPanel'
import { Step1Metadata } from './wizard/steps/Step1Metadata'
import { Step2Stimuli } from './wizard/steps/Step2Stimuli'
import { Step3Interactions } from './wizard/steps/Step3Interactions'
import { Step4Associations } from './wizard/steps/Step4Associations'
import { Step5Constraints } from './wizard/steps/Step5Constraints'
import { Step6Review } from './wizard/steps/Step6Review'

export function QuestionWizard() {
  const navigate = useNavigate()
  const { currentStep, setCurrentStep, isDirty, reset } =
    useQuestionEditorStore()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const goToStep = (step: number) => {
    if (step >= 1 && step <= WIZARD_STEP_COUNT) setCurrentStep(step)
  }

  const handleCancel = () => {
    if (isDirty) {
      setCancelDialogOpen(true)
    } else {
      reset()
      void navigate('/questions')
    }
  }

  const handleConfirmCancel = () => {
    reset()
    setCancelDialogOpen(false)
    void navigate('/questions')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="gap-1.5"
        >
          <X className="size-4" />
          Cancel
        </Button>
        <WizardStepNav currentStep={currentStep} onStepClick={goToStep} />
        {/* Spacer to visually center the step nav */}
        <div className="w-20" />
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="flex gap-8">
        {/* Step content */}
        <div className="min-w-0 flex-1">
          {currentStep === 1 && <Step1Metadata onNext={() => goToStep(2)} />}
          {currentStep === 2 && (
            <Step2Stimuli
              onPrev={() => goToStep(1)}
              onNext={() => goToStep(3)}
            />
          )}
          {currentStep === 3 && (
            <Step3Interactions
              onPrev={() => goToStep(2)}
              onNext={() => goToStep(4)}
            />
          )}
          {currentStep === 4 && (
            <Step4Associations
              onPrev={() => goToStep(3)}
              onNext={() => goToStep(5)}
            />
          )}
          {currentStep === 5 && (
            <Step5Constraints
              onPrev={() => goToStep(4)}
              onNext={() => goToStep(6)}
            />
          )}
          {currentStep === 6 && <Step6Review onPrev={() => goToStep(5)} />}
        </div>

        {/* Recap panel */}
        <WizardRecapPanel onNavigate={goToStep} />
      </div>

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Discard changes?"
        description="You have unsaved changes. If you leave now, your progress will be lost."
        confirmLabel="Discard"
        variant="destructive"
        onConfirm={handleConfirmCancel}
      />
    </div>
  )
}

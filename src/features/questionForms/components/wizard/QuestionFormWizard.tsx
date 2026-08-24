import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useQuestion } from '@/features/questions/hooks/useQuestions'
import { useQuestionForm } from '../../hooks/useQuestionForms'
import { questionDetailToDefinition } from '../../lib/toQuestionDefinition'
import {
  useQuestionFormEditorStore,
  WIZARD_STEP_COUNT,
} from '../../store/questionFormEditorStore'
import { WizardStepNav } from '@/features/questions/components/wizard/WizardStepNav'
import { Step1Profile } from './steps/Step1Profile'
import { Step2Mechanisms } from './steps/Step2Mechanisms'
import { Step3Stimuli } from './steps/Step3Stimuli'
import { Step4Layout } from './steps/Step4Layout'
import { Step5Review } from './steps/Step5Review'

const STEP_LABELS = ['Profile', 'Mechanisms', 'Stimuli', 'Layout', 'Review']

interface QuestionFormWizardProps {
  questionId: string
  /** When provided, the wizard edits this existing QFD instead of creating one. */
  formId?: string
}

export function QuestionFormWizard({
  questionId,
  formId,
}: QuestionFormWizardProps) {
  const navigate = useNavigate()
  const { data: question } = useQuestion(questionId)
  const { data: existingForm } = useQuestionForm(formId ?? '')
  const {
    currentStep,
    setCurrentStep,
    draft,
    reset,
    initForQuestion,
    initFromExisting,
  } = useQuestionFormEditorStore()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  useEffect(() => {
    if (!question) return
    const qd = questionDetailToDefinition(question)
    if (formId && existingForm) {
      if (draft.existingFormId !== existingForm.id) {
        initFromExisting(qd, existingForm)
      }
      return
    }
    // Create mode: reinitialize whenever the draft does not represent a fresh,
    // id-less session for this question (covers edit -> create transitions).
    if (draft.questionId !== question.id || draft.existingFormId !== null) {
      initForQuestion(qd)
    }
  }, [
    question,
    existingForm,
    formId,
    draft.questionId,
    draft.existingFormId,
    initForQuestion,
    initFromExisting,
  ])

  const goToStep = (step: number) => {
    if (step >= 1 && step <= WIZARD_STEP_COUNT) setCurrentStep(step)
  }

  const handleCancel = () => setCancelDialogOpen(true)

  const handleConfirmCancel = () => {
    reset()
    setCancelDialogOpen(false)
    void navigate(`/questions/${questionId}`)
  }

  if (!draft.qd) return null

  return (
    <div className="flex flex-col gap-4">
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
        <WizardStepNav
          currentStep={currentStep}
          onStepClick={goToStep}
          labels={STEP_LABELS}
        />
        <div className="w-20" />
      </div>

      <Separator />

      <div className="min-w-0 flex-1">
        {currentStep === 1 && <Step1Profile onNext={() => goToStep(2)} />}
        {currentStep === 2 && (
          <Step2Mechanisms
            onPrev={() => goToStep(1)}
            onNext={() => goToStep(3)}
          />
        )}
        {currentStep === 3 && (
          <Step3Stimuli onPrev={() => goToStep(2)} onNext={() => goToStep(4)} />
        )}
        {currentStep === 4 && (
          <Step4Layout onPrev={() => goToStep(3)} onNext={() => goToStep(5)} />
        )}
        {currentStep === 5 && <Step5Review onPrev={() => goToStep(4)} />}
      </div>

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Discard this form definition?"
        description="You have unsaved changes. If you leave now, your progress will be lost."
        confirmLabel="Discard"
        variant="destructive"
        onConfirm={handleConfirmCancel}
      />
    </div>
  )
}

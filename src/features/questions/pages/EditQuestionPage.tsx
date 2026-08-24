import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { QuestionWizard } from '../components/QuestionWizard'
import { useQuestion } from '../hooks/useQuestions'
import { useQuestionEditorStore } from '../store/questionEditorStore'
import type { QuestionDetailDto } from '@/api/questions/questionsApi'

/**
 * Initializes the editor store from a loaded question once, during render,
 * before <QuestionWizard /> mounts. The parent's `key={question.id}` forces a
 * fresh mount (and fresh initialization) per question without using effects.
 */
function WizardWithQuestion({ question }: { question: QuestionDetailDto }) {
  useState(() => {
    useQuestionEditorStore.getState().initFromQuestion(question)
  })

  return <QuestionWizard />
}

export function EditQuestionPage() {
  const { id } = useParams<{ id: string }>()
  const { data: question, isLoading, isError } = useQuestion(id ?? '')

  if (isLoading) return <PageLoader />

  if (isError || !question) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-destructive">Question not found.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Edit Question" description="" />
      <WizardWithQuestion key={question.id} question={question} />
    </div>
  )
}

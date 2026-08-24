import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { QuestionWizard } from '../components/QuestionWizard'
import { useQuestionEditorStore } from '../store/questionEditorStore'

export function CreateQuestionPage() {
  // Reset the draft store once during the first render, before <QuestionWizard />
  // mounts, so React Hook Form reads blank defaultValues instead of stale
  // session data. Using a useState initializer avoids setState-in-effect.
  useState(() => {
    useQuestionEditorStore.getState().initNew()
  })

  return (
    <div>
      <PageHeader
        title="New Question"
        description="Define a new question for your question bank."
      />
      <QuestionWizard />
    </div>
  )
}

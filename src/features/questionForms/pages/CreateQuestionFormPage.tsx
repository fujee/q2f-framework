import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { QuestionFormWizard } from '../components/wizard/QuestionFormWizard'

export function CreateQuestionFormPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return null

  return (
    <div>
      <PageHeader
        title="New Question Form"
        description="Create a question form definition for this question."
      />
      <QuestionFormWizard questionId={id} />
    </div>
  )
}

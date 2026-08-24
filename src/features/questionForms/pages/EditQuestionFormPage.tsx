import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { QuestionFormWizard } from '../components/wizard/QuestionFormWizard'

export function EditQuestionFormPage() {
  const { id, formId } = useParams<{ id: string; formId: string }>()
  if (!id || !formId) return null

  return (
    <div>
      <PageHeader
        title="Edit Question Form"
        description="Update the question form definition for this question."
      />
      <QuestionFormWizard questionId={id} formId={formId} />
    </div>
  )
}

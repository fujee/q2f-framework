import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useQuestion } from '@/features/questions/hooks/useQuestions'
import {
  useQuestionForm,
  useDeleteQuestionForm,
} from '../hooks/useQuestionForms'
import { questionDetailToDefinition } from '../lib/toQuestionDefinition'
import { FindingsList } from '../components/shared/FindingsList'
import { ConformanceStatusBadge } from '../components/ConformanceStatusBadge'
import { validateQFD } from '@/domain/qfd/validation/validateQFD'
import { evaluateProfileFeasibility } from '@/domain/qfd/feasibility/evaluateProfileFeasibility'
import { evaluateConformance } from '@/domain/qfd/conformance/evaluateConformance'
import { PROFILE_REGISTRY } from '@/domain/qfd/profiles/registry'
import { INTERACTION_TYPE_MAP } from '@/lib/interactionTypes'

export function QuestionFormDetailPage() {
  const { id: questionId, formId } = useParams<{ id: string; formId: string }>()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: question, isLoading: isQuestionLoading } = useQuestion(
    questionId ?? ''
  )
  const { data: qfd, isLoading: isFormLoading } = useQuestionForm(formId ?? '')
  const deleteQuestionForm = useDeleteQuestionForm(questionId ?? '')

  const results = useMemo(() => {
    if (!question || !qfd) return null
    const qd = questionDetailToDefinition(question)
    const profile = PROFILE_REGISTRY[qfd.targetProfileRef]
    return {
      validation: validateQFD(qfd, qd),
      feasibility: evaluateProfileFeasibility(qd, qfd, profile),
      conformance: evaluateConformance(qd, qfd, profile),
    }
  }, [question, qfd])

  if (isQuestionLoading || isFormLoading) return <PageLoader />
  if (!question || !qfd) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-destructive">Question form not found.</p>
      </div>
    )
  }

  const handleDelete = () => {
    deleteQuestionForm.mutate(qfd.id, {
      onSuccess: () => void navigate(`/questions/${questionId}`),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {PROFILE_REGISTRY[qfd.targetProfileRef]?.name ??
              qfd.targetProfileRef}
            {results && (
              <ConformanceStatusBadge status={results.conformance.aggregate} />
            )}
          </span>
        }
        description="Question form definition"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/questions/${questionId}`}>
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/questions/${questionId}/forms/${qfd.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/questions/${questionId}/forms/${qfd.id}/preview`}>
                <Eye className="size-4" />
                Preview
              </Link>
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={deleteQuestionForm.isPending}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Interaction Realizations ({qfd.interactionRealizations.length})
        </p>
        <div className="divide-y divide-border rounded-md border border-border">
          {qfd.interactionRealizations.map((ir) => {
            const interaction = question.responseInteractions.find(
              (i) => i.id === ir.interactionRef
            )
            const meta = interaction
              ? INTERACTION_TYPE_MAP[interaction.type]
              : null
            return (
              <div
                key={ir.id}
                className="flex items-center gap-2 px-3 py-2 text-xs"
              >
                <span className="font-mono">
                  {interaction?.code ?? ir.interactionRef}
                </span>
                {meta && (
                  <span className="text-muted-foreground">({meta.label})</span>
                )}
                <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
                  {ir.mechanism}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {qfd.stimulusRealizations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Stimulus Realizations ({qfd.stimulusRealizations.length})
          </p>
          <div className="divide-y divide-border rounded-md border border-border">
            {qfd.stimulusRealizations.map((sr) => {
              const stimulus = question.stimuli.find(
                (s) => s.id === sr.stimulusRef
              )
              return (
                <div
                  key={sr.id}
                  className="flex items-center gap-2 px-3 py-2 text-xs"
                >
                  <span className="font-mono">
                    {stimulus?.code ?? sr.stimulusRef}
                  </span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
                    {sr.mode}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Separator />

      {results && (
        <div className="space-y-4">
          <FindingsList
            title="Internal Validation"
            findings={results.validation.findings}
            passMessage="This form definition passes all QFD-FB-1.2 validation rules."
          />
          <FindingsList
            title="Profile Feasibility"
            findings={results.feasibility.findings}
            passMessage="This form is feasible under the target profile."
          />
          <FindingsList
            title="QD–QFD Conformance"
            findings={results.conformance.findings}
            passMessage="This form conforms fully to its question definition."
          />
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this form definition?"
        description="This will permanently delete this question form definition."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

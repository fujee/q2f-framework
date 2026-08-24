import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useQuestion } from '@/features/questions/hooks/useQuestions'
import { useQuestionForm } from '../hooks/useQuestionForms'
import { questionDetailToDefinition } from '../lib/toQuestionDefinition'
import {
  computeQfdConformanceStatus,
  computePreviewBlockers,
} from '../lib/qfdStatus'
import { ConformanceStatusBadge } from '../components/ConformanceStatusBadge'
import { FindingsList } from '../components/shared/FindingsList'
import { QfdPreview } from '../renderer/RenderPreview'
import { buildHtmlFragment } from '../renderer/htmlFragment'
import { openPaperPdf } from '../renderer/paperPdf'
import { PROFILE_REGISTRY } from '@/domain/qfd/profiles/registry'

export function QfdPreviewPage() {
  const { id: questionId, formId } = useParams<{ id: string; formId: string }>()
  const { data: question, isLoading: isQuestionLoading } = useQuestion(
    questionId ?? ''
  )
  const { data: qfd, isLoading: isFormLoading } = useQuestionForm(formId ?? '')

  const qd = useMemo(
    () => (question ? questionDetailToDefinition(question) : null),
    [question]
  )
  // Static markup is only produced for the paper medium (its A4 sheet + PDF).
  const paperHtml = useMemo(
    () => (qd && qfd ? buildHtmlFragment(qd, qfd) : ''),
    [qd, qfd]
  )

  if (isQuestionLoading || isFormLoading) return <PageLoader />
  if (!question || !qfd || !qd) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-destructive">Question form not found.</p>
      </div>
    )
  }

  const profile = PROFILE_REGISTRY[qfd.targetProfileRef]
  const isPaper = profile.mediumFamily === 'ConventionalPaper'
  const status = computeQfdConformanceStatus(qd, qfd)
  const blockers = computePreviewBlockers(qd, qfd)

  if (blockers.length > 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`${profile.name} — Preview`}
          description={question.shortDescription ?? 'Question form preview'}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to={`/questions/${questionId}/forms/${qfd.id}`}>
                  <ArrowLeft className="size-4" />
                  Back
                </Link>
              </Button>
            </div>
          }
        />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            Preview unavailable
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This form cannot be rendered for the {profile.name} profile.
          </p>
          <div className="mt-3">
            <FindingsList
              title="Profile compatibility"
              findings={blockers}
              passMessage="The profile supports this form."
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {profile.name} — Preview
            <ConformanceStatusBadge status={status} />
          </span>
        }
        description={question.shortDescription ?? 'Question form preview'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/questions/${questionId}/forms/${qfd.id}`}>
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            {isPaper && (
              <Button onClick={() => openPaperPdf(qd, qfd)}>
                <FileText className="size-4" />
                Generate PDF
              </Button>
            )}
          </div>
        }
      />

      {isPaper ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Static paper rendering (A4). Use{' '}
            <span className="font-medium text-foreground">Generate PDF</span> to
            open the print dialog and save as PDF.
          </p>
          <div className="mx-auto w-full max-w-[210mm] overflow-x-auto">
            <div
              className="mx-auto w-[210mm] min-h-[297mm] bg-white p-10 text-black shadow-md"
              dangerouslySetInnerHTML={{ __html: paperHtml }}
            />
          </div>
          <div className="flex justify-center">
            <Button onClick={() => openPaperPdf(qd, qfd)}>
              <FileText className="size-4" />
              Generate PDF
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Interactive web rendering. SpatialSelection, marking, ordering, and
            relating are directly manipulable.
          </p>
          <QfdPreview qd={qd} qfd={qfd} />
        </div>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Eye, FileStack, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuestionForms } from '../hooks/useQuestionForms'
import { questionDetailToDefinition } from '../lib/toQuestionDefinition'
import { computeQfdConformanceStatus } from '../lib/qfdStatus'
import { ConformanceStatusBadge } from './ConformanceStatusBadge'
import { PROFILE_REGISTRY } from '@/domain/qfd/profiles/registry'
import type { QuestionDetailDto } from '@/api/questions/questionsApi'

export function QuestionFormsSection({
  question,
}: {
  question: QuestionDetailDto
}) {
  const { data: forms, isLoading } = useQuestionForms(question.id)
  const qd = useMemo(() => questionDetailToDefinition(question), [question])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Question Forms {forms ? `(${forms.length})` : ''}
        </p>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/questions/${question.id}/forms/new`}>
            <Plus className="size-4" />
            Create Form
          </Link>
        </Button>
      </div>

      {!isLoading && forms?.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No form definitions have been created for this question yet.
        </p>
      )}

      {forms && forms.length > 0 && (
        <div className="divide-y divide-border rounded-md border border-border">
          {forms.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50"
            >
              <Link
                to={`/questions/${question.id}/forms/${f.id}`}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <FileStack className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="font-medium">
                  {PROFILE_REGISTRY[f.targetProfileRef]?.name ??
                    f.targetProfileRef}
                </span>
                <span className="text-muted-foreground">
                  · {f.interactionRealizations.length} interaction
                  realization(s)
                </span>
              </Link>
              <ConformanceStatusBadge
                status={computeQfdConformanceStatus(qd, f)}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 text-[11px]"
                asChild
              >
                <Link to={`/questions/${question.id}/forms/${f.id}/preview`}>
                  <Eye className="size-3" />
                  Preview
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

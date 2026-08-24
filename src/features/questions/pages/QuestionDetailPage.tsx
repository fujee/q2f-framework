import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ArrowDownUp,
  GitBranch,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { QuestionStatusBadge } from '@/features/questions/components/QuestionStatusBadge'
import {
  useQuestion,
  useDeleteQuestion,
} from '@/features/questions/hooks/useQuestions'
import { STIMULUS_TYPE_MAP } from '@/lib/stimulusTypes'
import { INTERACTION_TYPE_MAP } from '@/lib/interactionTypes'
import {
  Pill,
  renderInteractionDetail,
} from '@/features/questions/components/shared/renderInteractionDetail'
import { StimulusPreview } from '@/features/questions/components/shared/StimulusPreview'
import { QuestionFormsSection } from '@/features/questionForms/components/QuestionFormsSection'
import type {
  InteractionStimulusAssociation,
  QuestionConstraint,
  ResponseInteraction,
  Stimulus,
} from '@/domain/qd/model'

// ── Shared helpers ────────────────────────────────────────────────────────────

function AssociationsSection({
  associations,
  interactions,
  stimuli,
}: {
  associations: InteractionStimulusAssociation[]
  interactions: ResponseInteraction[]
  stimuli: Stimulus[]
}) {
  if (!associations.length) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Associations ({associations.length})
      </p>
      <div className="divide-y divide-border rounded-md border border-border">
        {associations.map((assoc) => {
          const interaction = interactions.find(
            (i) => i.id === assoc.interactionRef
          )
          const stimulus = stimuli.find((s) => s.id === assoc.stimulusRef)
          const iaMeta = interaction
            ? INTERACTION_TYPE_MAP[interaction.type]
            : null
          const sMeta = stimulus ? STIMULUS_TYPE_MAP[stimulus.type] : null
          const IaIcon = iaMeta?.icon
          const SIcon = sMeta?.icon
          return (
            <div
              key={assoc.id}
              className="flex items-center gap-2 px-3 py-2 text-xs"
            >
              {IaIcon && (
                <IaIcon className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="font-medium">{interaction?.code ?? '?'}</span>
              {iaMeta && (
                <span className="text-muted-foreground">({iaMeta.label})</span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                <div className="h-px w-3 bg-border" />
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs font-medium',
                    assoc.role === 'Context'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  )}
                >
                  {assoc.role}
                </span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </div>
              {SIcon && (
                <SIcon className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="font-medium">{stimulus?.code ?? '?'}</span>
              {sMeta && (
                <span className="text-muted-foreground">({sMeta.label})</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ConstraintsSection({
  constraints,
  interactions,
}: {
  constraints: QuestionConstraint[]
  interactions: ResponseInteraction[]
}) {
  if (!constraints.length) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Constraints ({constraints.length})
      </p>
      <div className="space-y-2">
        {constraints.map((c) => {
          const isSeq = c.type === 'Sequence'
          const Icon = isSeq ? ArrowDownUp : GitBranch
          return (
            <div
              key={c.id}
              className="space-y-1.5 rounded-md border border-border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                  {isSeq ? 'Sequence' : 'Dependency'}
                </span>
                <Pill>{c.strength}</Pill>
              </div>
              {c.description && (
                <p className="text-sm text-foreground">{c.description}</p>
              )}
              {isSeq ? (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {c.interactionRefs.map((ref, i) => {
                    const ia = interactions.find((x) => x.id === ref)
                    return (
                      <span key={ref} className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">
                          {ia?.code ?? '?'}
                        </span>
                        {i < c.interactionRefs.length - 1 && (
                          <ArrowRight className="size-3 text-muted-foreground" />
                        )}
                      </span>
                    )
                  })}
                </div>
              ) : (
                (() => {
                  const pred = interactions.find(
                    (i) => i.id === c.predecessorInteractionRef
                  )
                  const succ = interactions.find(
                    (i) => i.id === c.successorInteractionRef
                  )
                  return (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium text-foreground">
                        {pred?.code ?? '?'}
                      </span>
                      {pred && (
                        <span className="text-muted-foreground">
                          ({INTERACTION_TYPE_MAP[pred.type].label})
                        </span>
                      )}
                      <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {succ?.code ?? '?'}
                      </span>
                      {succ && (
                        <span className="text-muted-foreground">
                          ({INTERACTION_TYPE_MAP[succ.type].label})
                        </span>
                      )}
                      <span className="text-muted-foreground">· {c.rule}</span>
                    </div>
                  )
                })()
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: question, isLoading, isError } = useQuestion(id ?? '')
  const deleteQuestion = useDeleteQuestion()
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) return <PageLoader />

  if (isError || !question) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-destructive">Question not found.</p>
      </div>
    )
  }

  const handleDelete = () => {
    deleteQuestion.mutate(question.id, {
      onSuccess: () => void navigate('/questions'),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span
            className="rich-text-content"
            dangerouslySetInnerHTML={{
              __html: question.shortDescription || '',
            }}
          />
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/questions">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/questions/${question.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={deleteQuestion.isPending}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        }
      />

      {/* ── Metadata ── */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <QuestionStatusBadge status={question.status} />
        </div>

        {question.longDescription && (
          <div
            className="rich-text-content text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: question.longDescription }}
          />
        )}

        {question.categories.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-3 text-xs">
              {question.categories.map((c) => (
                <span key={c.categoryId} className="text-muted-foreground">
                  {c.categorizationName}:{' '}
                  <span className="font-medium text-foreground">
                    {c.categoryName}
                  </span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Stimuli ── */}
      {question.stimuli.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Stimuli ({question.stimuli.length})
          </p>
          {question.stimuli.map((s) => (
            <StimulusPreview key={s.id} stimulus={s} />
          ))}
        </div>
      )}

      {/* ── Interactions ── */}
      {question.responseInteractions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Interactions ({question.responseInteractions.length})
          </p>
          {question.responseInteractions.map((ia) => {
            const meta = INTERACTION_TYPE_MAP[ia.type]
            const Icon = meta.icon
            return (
              <div key={ia.id} className="rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">{ia.code}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                    {meta.label}
                  </span>
                  {ia.instruction && (
                    <div
                      className="rich-text-content max-w-[60ch] text-xs text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: ia.instruction }}
                    />
                  )}
                </div>
                {renderInteractionDetail(ia)}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Associations ── */}
      <AssociationsSection
        associations={question.interactionStimulusAssociations}
        interactions={question.responseInteractions}
        stimuli={question.stimuli}
      />

      {/* ── Constraints ── */}
      <ConstraintsSection
        constraints={question.constraints}
        interactions={question.responseInteractions}
      />

      {/* ── Question Forms ── */}
      <QuestionFormsSection question={question} />

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-3 text-center text-xs">
        {[
          { label: 'Stimuli', count: question.stimuli.length },
          {
            label: 'Interactions',
            count: question.responseInteractions.length,
          },
          {
            label: 'Associations',
            count: question.interactionStimulusAssociations.length,
          },
          { label: 'Constraints', count: question.constraints.length },
        ].map(({ label, count }) => (
          <div
            key={label}
            className="rounded-lg border border-dashed border-border p-3"
          >
            <p className="text-2xl font-semibold text-foreground">{count}</p>
            <p className="text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${question.shortDescription}"?`}
        description="This will permanently delete the question and all its interactions, stimuli, associations, and constraints."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

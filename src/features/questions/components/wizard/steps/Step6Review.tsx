import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Save,
  ArrowDownUp,
  GitBranch,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useQuestionEditorStore } from '@/features/questions/store/questionEditorStore'
import {
  useCreateQuestion,
  useUpdateQuestion,
} from '@/features/questions/hooks/useQuestions'
import { useCategorizations } from '@/features/categories/hooks/useCategorizations'
import { QuestionStatusBadge } from '@/features/questions/components/QuestionStatusBadge'
import { STIMULUS_TYPE_MAP } from '@/lib/stimulusTypes'
import { INTERACTION_TYPE_MAP } from '@/lib/interactionTypes'
import {
  Pill,
  InteractionDetail,
} from '@/features/questions/components/shared/renderInteractionDetail'
import { StimulusPreview } from '@/features/questions/components/shared/StimulusPreview'
import { draftToQuestionDefinition } from '@/features/questions/lib/draftToQuestionDefinition'
import { validateQD } from '@/domain/qd/validation/validateQD'
import type { Finding, FindingStatus } from '@/domain/qd/validation/validateQD'

interface Step6ReviewProps {
  onPrev: () => void
}

const STATUS_ORDER: Record<FindingStatus, number> = {
  FAIL: 0,
  REVIEW_REQUIRED: 1,
  WARNING: 2,
  PASS: 3,
}

function ValidationPanel({ findings }: { findings: Finding[] }) {
  const actionable = findings
    .filter((f) => f.status !== 'PASS')
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

  if (actionable.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-400">
        <Info className="size-4 shrink-0" />
        This question passes all QD-FB-2.1 validation rules.
      </div>
    )
  }

  const failCount = actionable.filter((f) => f.status === 'FAIL').length

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Validation ({actionable.length})
      </p>
      <div className="divide-y divide-border rounded-md border border-border">
        {actionable.map((f, i) => (
          <div
            key={`${f.ruleId}-${i}`}
            className="flex items-start gap-2 px-3 py-2 text-xs"
          >
            {f.status === 'FAIL' ? (
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            ) : f.status === 'REVIEW_REQUIRED' ? (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <div className="min-w-0 flex-1">
              <span className="font-mono text-muted-foreground">
                {f.ruleId}
              </span>{' '}
              <span
                className={cn(
                  f.status === 'FAIL' ? 'text-destructive' : 'text-foreground'
                )}
              >
                {f.message}
              </span>
            </div>
          </div>
        ))}
      </div>
      {failCount > 0 && (
        <p className="text-xs text-destructive">
          Resolve the {failCount} error{failCount !== 1 ? 's' : ''} above before
          saving.
        </p>
      )}
    </div>
  )
}

export function Step6Review({ onPrev }: Step6ReviewProps) {
  const navigate = useNavigate()
  const { questionId, draft, reset } = useQuestionEditorStore()
  const { data: categorizations } = useCategorizations()
  const [isSaving, setIsSaving] = useState(false)

  const createQuestion = useCreateQuestion()
  const updateQuestion = useUpdateQuestion()

  const validation = useMemo(
    () => validateQD(draftToQuestionDefinition(draft, questionId)),
    [draft, questionId]
  )
  const canSave = validation.aggregate === 'PASS'

  const assignedCategories =
    categorizations?.flatMap((cat) =>
      cat.categories
        .filter((c) => draft.categories.includes(c.id))
        .map((c) => ({ categorizationName: cat.name, categoryName: c.name }))
    ) ?? []

  const handleSave = async () => {
    if (!canSave) return
    setIsSaving(true)
    try {
      const payload = {
        shortDescription: draft.shortDescription,
        longDescription: draft.longDescription,
        status: draft.status,
        categoryIds: draft.categories,
        stimuli: draft.stimuli,
        responseInteractions: draft.responseInteractions,
        interactionStimulusAssociations: draft.interactionStimulusAssociations,
        constraints: draft.constraints,
      }

      let savedId: string
      if (questionId) {
        await updateQuestion.mutateAsync({ id: questionId, data: payload })
        savedId = questionId
      } else {
        const q = await createQuestion.mutateAsync(payload)
        savedId = q.id
      }

      reset()
      void navigate(`/questions/${savedId}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium">
          Review your question before saving.
        </p>
        <p className="text-xs text-muted-foreground">
          Review all steps before saving. Nothing is written to the server until
          you click Save.
        </p>
      </div>

      {/* Metadata */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold">
            {draft.shortDescription ? (
              <span
                className="rich-text-content"
                dangerouslySetInnerHTML={{ __html: draft.shortDescription }}
              />
            ) : (
              <span className="italic text-muted-foreground">No title set</span>
            )}
          </h3>
          <QuestionStatusBadge status={draft.status} />
        </div>
        {draft.longDescription && (
          <div
            className="rich-text-content text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: draft.longDescription }}
          />
        )}
        {assignedCategories.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-3 text-xs">
              {assignedCategories.map((c) => (
                <span
                  key={`${c.categorizationName}-${c.categoryName}`}
                  className="text-muted-foreground"
                >
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

      {/* Validation */}
      <ValidationPanel findings={validation.findings} />

      {/* Stimuli */}
      {draft.stimuli.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Stimuli ({draft.stimuli.length})
          </p>
          {draft.stimuli.map((s) => (
            <StimulusPreview key={s.id} stimulus={s} />
          ))}
        </div>
      )}

      {/* Interactions */}
      {draft.responseInteractions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Interactions ({draft.responseInteractions.length})
          </p>
          {draft.responseInteractions.map((ia) => {
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
                <InteractionDetail interaction={ia} />
              </div>
            )
          })}
        </div>
      )}

      {/* Associations */}
      {draft.interactionStimulusAssociations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Associations ({draft.interactionStimulusAssociations.length})
          </p>
          <div className="divide-y divide-border rounded-md border border-border">
            {draft.interactionStimulusAssociations.map((assoc) => {
              const interaction = draft.responseInteractions.find(
                (i) => i.id === assoc.interactionRef
              )
              const stimulus = draft.stimuli.find(
                (s) => s.id === assoc.stimulusRef
              )
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
                  <span className="font-medium">
                    {interaction?.code ?? '?'}
                  </span>
                  {iaMeta && (
                    <span className="text-muted-foreground">
                      ({iaMeta.label})
                    </span>
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
                    <span className="text-muted-foreground">
                      ({sMeta.label})
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Constraints */}
      {draft.constraints.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Constraints ({draft.constraints.length})
          </p>
          <div className="space-y-2">
            {draft.constraints.map((c) => {
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
                        const ia = draft.responseInteractions.find(
                          (x) => x.id === ref
                        )
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
                      const pred = draft.responseInteractions.find(
                        (i) => i.id === c.predecessorInteractionRef
                      )
                      const succ = draft.responseInteractions.find(
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
                          <span className="text-muted-foreground">
                            · {c.rule}
                          </span>
                        </div>
                      )
                    })()
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Counts */}
      <div className="grid grid-cols-4 gap-3 text-center text-xs">
        {[
          { label: 'Stimuli', count: draft.stimuli.length },
          { label: 'Interactions', count: draft.responseInteractions.length },
          {
            label: 'Associations',
            count: draft.interactionStimulusAssociations.length,
          },
          { label: 'Constraints', count: draft.constraints.length },
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

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          disabled={isSaving}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || !draft.shortDescription || !canSave}
          title={
            !canSave ? 'Resolve validation errors before saving' : undefined
          }
        >
          <Save className="size-4" />
          {isSaving
            ? 'Saving…'
            : questionId
              ? 'Update Question'
              : 'Create Question'}
        </Button>
      </div>
    </div>
  )
}

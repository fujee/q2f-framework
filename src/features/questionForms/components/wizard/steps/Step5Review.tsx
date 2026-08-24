import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuestionFormEditorStore } from '../../../store/questionFormEditorStore'
import { assembleQfd } from '../../../lib/assembleQfd'
import {
  useCreateQuestionForm,
  useUpdateQuestionForm,
} from '../../../hooks/useQuestionForms'
import { FindingsList } from '../../shared/FindingsList'
import { ConformanceStatusBadge } from '../../ConformanceStatusBadge'
import { validateQFD } from '@/domain/qfd/validation/validateQFD'
import { evaluateProfileFeasibility } from '@/domain/qfd/feasibility/evaluateProfileFeasibility'
import { evaluateConformance } from '@/domain/qfd/conformance/evaluateConformance'
import { PROFILE_REGISTRY } from '@/domain/qfd/profiles/registry'

interface Step5ReviewProps {
  onPrev: () => void
}

export function Step5Review({ onPrev }: Step5ReviewProps) {
  const navigate = useNavigate()
  const { draft, reset } = useQuestionFormEditorStore()
  const [isSaving, setIsSaving] = useState(false)
  const createQuestionForm = useCreateQuestionForm()
  const updateQuestionForm = useUpdateQuestionForm()

  const qd = draft.qd

  const { qfdBody, validation, feasibility, conformance } = useMemo(() => {
    if (!qd || !draft.rootLayout)
      return {
        qfdBody: null,
        validation: null,
        feasibility: null,
        conformance: null,
      }
    const body = assembleQfd(qd, draft)
    const profile = PROFILE_REGISTRY[draft.targetProfileRef]
    const qfdForEval = { id: 'draft', ...body }
    return {
      qfdBody: body,
      validation: validateQFD(qfdForEval, qd),
      feasibility: evaluateProfileFeasibility(qd, qfdForEval, profile),
      conformance: evaluateConformance(qd, qfdForEval, profile),
    }
  }, [qd, draft])

  if (!qd || !qfdBody || !validation || !feasibility || !conformance)
    return null

  const canSave = validation.aggregate === 'PASS'

  const handleSave = async () => {
    if (!canSave) return
    setIsSaving(true)
    try {
      let savedId: string
      if (draft.existingFormId) {
        await updateQuestionForm.mutateAsync({
          id: draft.existingFormId,
          data: qfdBody,
        })
        savedId = draft.existingFormId
      } else {
        const created = await createQuestionForm.mutateAsync(qfdBody)
        savedId = created.id
      }
      reset()
      void navigate(`/questions/${qd.id}/forms/${savedId}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium">
          Review
          <ConformanceStatusBadge status={conformance.aggregate} />
        </p>
        <p className="text-xs text-muted-foreground">
          Targeting{' '}
          <span className="font-medium text-foreground">
            {PROFILE_REGISTRY[draft.targetProfileRef].name}
          </span>
          . Resolve any validation errors before saving; feasibility and
          conformance findings are informational.
        </p>
      </div>

      <FindingsList
        title="Internal Validation"
        findings={validation.findings}
        passMessage="This form definition passes all QFD-FB-1.2 validation rules."
      />
      <FindingsList
        title="Profile Feasibility"
        findings={feasibility.findings}
        passMessage="This form is feasible under the target profile."
      />
      <FindingsList
        title="QD–QFD Conformance"
        findings={conformance.findings}
        passMessage="This form conforms fully to its question definition."
      />

      <div className="flex justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onPrev} className="gap-1.5">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={!canSave || isSaving}
          className="gap-1.5"
        >
          <Save className="size-4" />
          {isSaving ? 'Saving...' : 'Save Form Definition'}
        </Button>
      </div>
    </div>
  )
}

import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuestionFormEditorStore } from '../../../store/questionFormEditorStore'
import { MECHANISM_DESCRIPTORS } from '@/domain/qfd/mechanisms/registry'
import { PROFILE_REGISTRY } from '@/domain/qfd/profiles/registry'
import { INTERACTION_TYPE_MAP } from '@/lib/interactionTypes'
import type { ResponseMechanism } from '@/domain/qfd/model'

interface Step2MechanismsProps {
  onPrev: () => void
  onNext: () => void
}

export function Step2Mechanisms({ onPrev, onNext }: Step2MechanismsProps) {
  const { draft, setMechanism, setRealizedInstruction } =
    useQuestionFormEditorStore()
  const qd = draft.qd
  if (!qd) return null

  const profile = PROFILE_REGISTRY[draft.targetProfileRef]
  const allMechanisms = Object.values(MECHANISM_DESCRIPTORS)

  const canProceed = qd.responseInteractions.every(
    (i) => !!draft.mechanisms[i.id]
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium">Response Mechanisms</p>
        <p className="text-xs text-muted-foreground">
          Choose how each interaction will be realized under the {profile.name}.
          Only mechanisms compatible with the interaction type and supported by
          this profile are offered.
        </p>
      </div>

      <div className="space-y-4">
        {qd.responseInteractions.map((interaction) => {
          const compatible = allMechanisms.filter(
            (m) =>
              m.compatibleInteractionTypes.has(interaction.type) &&
              profile.supportedResponseMechanisms.has(m.mechanism)
          )
          const meta = INTERACTION_TYPE_MAP[interaction.type]

          return (
            <div
              key={interaction.id}
              className="space-y-3 rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {interaction.code}
                </span>
                <span className="text-xs text-muted-foreground">
                  {meta?.label ?? interaction.type}
                </span>
              </div>

              {compatible.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  No mechanism supported by {profile.name} is compatible with
                  this interaction type.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Mechanism</Label>
                  <Select
                    value={draft.mechanisms[interaction.id] || undefined}
                    onValueChange={(value) =>
                      setMechanism(interaction.id, value as ResponseMechanism)
                    }
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select a mechanism" />
                    </SelectTrigger>
                    <SelectContent>
                      {compatible.map((m) => (
                        <SelectItem key={m.mechanism} value={m.mechanism}>
                          {m.mechanism}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Realized Instruction (optional)</Label>
                <Textarea
                  rows={2}
                  placeholder="Leave empty to use the question's own instruction verbatim"
                  value={draft.realizedInstructions[interaction.id] ?? ''}
                  onChange={(e) =>
                    setRealizedInstruction(interaction.id, e.target.value)
                  }
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onPrev} className="gap-1.5">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="gap-1.5">
          Next
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { Layers, MousePointerClick } from 'lucide-react'
import { useQuestionEditorStore } from '@/features/questions/store/questionEditorStore'
import { INTERACTION_TYPE_MAP } from '@/lib/interactionTypes'
import { STIMULUS_TYPE_MAP } from '@/lib/stimulusTypes'
import type {
  AssociationRole,
  InteractionStimulusAssociation,
} from '@/domain/qd/model'

export function AssociationMatrix() {
  const { draft, addAssociation, removeAssociation, updateAssociationRole } =
    useQuestionEditorStore()
  const stimuli = draft.stimuli
  const interactions = draft.responseInteractions
  const associations = draft.interactionStimulusAssociations

  if (!stimuli.length && !interactions.length) {
    return (
      <EmptyState
        icon={Layers}
        title="Nothing to associate yet"
        description="Add stimuli in Step 2 and interactions in Step 3 first."
      />
    )
  }
  if (!stimuli.length) {
    return (
      <EmptyState
        icon={Layers}
        title="No stimuli defined"
        description="Go back to Step 2 and add at least one stimulus."
      />
    )
  }
  if (!interactions.length) {
    return (
      <EmptyState
        icon={MousePointerClick}
        title="No interactions defined"
        description="Go back to Step 3 and add at least one interaction."
      />
    )
  }

  const findAssoc = (
    interactionRef: string,
    stimulusRef: string
  ): InteractionStimulusAssociation | undefined =>
    associations.find(
      (a) =>
        a.interactionRef === interactionRef && a.stimulusRef === stimulusRef
    )

  const toggleCell = (interactionRef: string, stimulusRef: string) => {
    const existing = findAssoc(interactionRef, stimulusRef)
    if (existing) {
      removeAssociation(existing.id)
    } else {
      addAssociation({
        id: crypto.randomUUID(),
        interactionRef,
        stimulusRef,
        role: 'Context',
      })
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Interaction ↓ &nbsp;/&nbsp; Stimulus →
            </th>
            {stimuli.map((s) => {
              const meta = STIMULUS_TYPE_MAP[s.type]
              const Icon = meta.icon
              return (
                <th
                  key={s.id}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Icon className="size-4" />
                    <span>{s.code}</span>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {interactions.map((ia) => {
            const iaMeta = INTERACTION_TYPE_MAP[ia.type]
            const IaIcon = iaMeta.icon
            return (
              <tr key={ia.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <IaIcon className="size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{ia.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {iaMeta.label}
                      </p>
                    </div>
                  </div>
                </td>
                {stimuli.map((s) => {
                  const assoc = findAssoc(ia.id, s.id)
                  return (
                    <td key={s.id} className="px-4 py-3 text-center align-top">
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-primary"
                          checked={!!assoc}
                          onChange={() => toggleCell(ia.id, s.id)}
                          aria-label={`Associate stimulus ${s.code} with interaction ${ia.code}`}
                        />
                        {assoc && (
                          <Select
                            value={assoc.role}
                            onValueChange={(v) =>
                              updateAssociationRole(
                                assoc.id,
                                v as AssociationRole
                              )
                            }
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Context">Context</SelectItem>
                              <SelectItem value="Workspace">
                                Workspace
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

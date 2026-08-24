import { ArrowLeft, ArrowRight, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useQuestionFormEditorStore } from '../../../store/questionFormEditorStore'
import { requiredStimulusIds } from '../../../lib/assembleQfd'
import { STIMULUS_TYPE_MAP } from '@/lib/stimulusTypes'
import type { StimulusType } from '@/domain/qd/model'
import type { StimulusRealizationMode } from '@/domain/qfd/model'

interface Step3StimuliProps {
  onPrev: () => void
  onNext: () => void
}

/** Text stimuli get a free-text area; Image/Audio/Video get a file upload with
 * preview (realizedContent stores the resulting data URL). */
function RealizedContentField({
  stimulusType,
  value,
  onChange,
}: {
  stimulusType: StimulusType
  value: string
  onChange: (value: string) => void
}) {
  if (stimulusType === 'Text') {
    return (
      <Textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  const accept =
    stimulusType === 'Image'
      ? 'image/*'
      : stimulusType === 'Audio'
        ? 'audio/*'
        : 'video/*'

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange((ev.target?.result as string) ?? '')
    reader.readAsDataURL(file)
  }

  if (!value) {
    return (
      <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border p-6 text-xs transition-colors hover:border-primary/50">
        <Upload className="size-6 text-muted-foreground" />
        <span className="text-muted-foreground">
          Click to upload {stimulusType.toLowerCase()}
        </span>
        <input
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleFile}
        />
      </label>
    )
  }

  return (
    <div className="relative w-fit">
      {stimulusType === 'Image' && (
        <img
          src={value}
          alt="Realized content preview"
          className="max-h-40 rounded-md border border-border object-contain"
        />
      )}
      {stimulusType === 'Audio' && <audio controls src={value} />}
      {stimulusType === 'Video' && (
        <video
          controls
          src={value}
          className="max-h-40 rounded-md border border-border"
        />
      )}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute -top-2 -right-2 size-6"
        onClick={() => onChange('')}
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}

export function Step3Stimuli({ onPrev, onNext }: Step3StimuliProps) {
  const { draft, setStimulusRealization } = useQuestionFormEditorStore()
  const qd = draft.qd
  if (!qd) return null

  const required = qd.stimuli.filter((s) => requiredStimulusIds(qd).has(s.id))

  const canProceed = required.every((s) => {
    if (s.materializationPolicy === 'Fixed') return true
    const sr = draft.stimulusRealizations[s.id]
    if (!sr) return false
    if (sr.mode === 'ReuseSource') return true
    return !!sr.realizedContent.trim()
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium">Stimulus Realizations</p>
        <p className="text-xs text-muted-foreground">
          Decide how each stimulus referenced by an interaction will be realized
          for this form.
        </p>
      </div>

      {required.length === 0 && (
        <p className="text-xs text-muted-foreground">
          This question has no stimuli requiring realization decisions.
        </p>
      )}

      <div className="space-y-4">
        {required.map((s) => {
          const meta = STIMULUS_TYPE_MAP[s.type]
          const sr = draft.stimulusRealizations[s.id]

          return (
            <div
              key={s.id}
              className="space-y-3 rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {s.code}
                </span>
                <span className="text-xs text-muted-foreground">
                  {meta?.label ?? s.type} · {s.materializationPolicy}
                </span>
              </div>
              {s.description && (
                <p className="text-xs text-muted-foreground">{s.description}</p>
              )}

              {s.materializationPolicy === 'Fixed' && (
                <p className="text-xs text-muted-foreground">
                  Reused exactly as authored (no decision required).
                </p>
              )}

              {s.materializationPolicy === 'Adaptable' && (
                <div className="space-y-3">
                  <div className="flex gap-4">
                    {(
                      [
                        'ReuseSource',
                        'AdaptSource',
                      ] as StimulusRealizationMode[]
                    ).map((mode) => (
                      <label
                        key={mode}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <input
                          type="radio"
                          name={`mode-${s.id}`}
                          checked={sr?.mode === mode}
                          onChange={() =>
                            setStimulusRealization(s.id, {
                              mode,
                              realizedContent: sr?.realizedContent ?? '',
                            })
                          }
                        />
                        {mode === 'ReuseSource'
                          ? 'Reuse as authored'
                          : 'Adapt content'}
                      </label>
                    ))}
                  </div>
                  {sr?.mode === 'AdaptSource' && (
                    <div className="space-y-1.5">
                      <Label>Adapted Content</Label>
                      <RealizedContentField
                        stimulusType={s.type}
                        value={sr.realizedContent}
                        onChange={(realizedContent) =>
                          setStimulusRealization(s.id, {
                            mode: 'AdaptSource',
                            realizedContent,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {s.materializationPolicy === 'SpecificationBased' && (
                <div className="space-y-1.5">
                  {s.contentSpecification && (
                    <p className="text-xs text-muted-foreground">
                      Specification: {s.contentSpecification}
                    </p>
                  )}
                  <Label>Materialized Content</Label>
                  <RealizedContentField
                    stimulusType={s.type}
                    value={sr?.realizedContent ?? ''}
                    onChange={(realizedContent) =>
                      setStimulusRealization(s.id, {
                        mode: 'MaterializeFromSpecification',
                        realizedContent,
                      })
                    }
                  />
                </div>
              )}
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

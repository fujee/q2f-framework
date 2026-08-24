import { STIMULUS_TYPE_MAP } from '@/lib/stimulusTypes'
import type { Stimulus } from '@/domain/qd/model'

/** Shared type-specific stimulus preview, used by both the wizard's review step
 * and the read-only question detail page. */
export function StimulusPreview({ stimulus: s }: { stimulus: Stimulus }) {
  const meta = STIMULUS_TYPE_MAP[s.type]
  const Icon = meta.icon

  const hasContent = s.type === 'Text' ? Boolean(s.content) : Boolean(s.source)

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{s.code}</span>
        {s.description && (
          <span className="text-xs text-muted-foreground">
            — {s.description}
          </span>
        )}
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
          {s.materializationPolicy}
        </span>
      </div>

      {s.type === 'Image' && s.source ? (
        <img
          src={s.source}
          alt={s.description || s.code}
          className="max-h-56 rounded object-contain"
        />
      ) : s.type === 'Audio' && s.source ? (
        <div className="space-y-1">
          <audio controls src={s.source} className="w-full" />
          {s.transcript && (
            <p className="text-xs italic text-muted-foreground">
              Transcript: {s.transcript}
            </p>
          )}
        </div>
      ) : s.type === 'Video' && s.source ? (
        <div className="space-y-1">
          <video controls src={s.source} className="max-h-48 w-full rounded" />
          {s.transcript && (
            <p className="text-xs italic text-muted-foreground">
              Transcript: {s.transcript}
            </p>
          )}
        </div>
      ) : s.type === 'Text' && s.content ? (
        <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded bg-muted px-3 py-2 text-xs text-foreground">
          {s.content}
        </pre>
      ) : !hasContent ? (
        <p className="text-xs italic text-muted-foreground">
          {s.materializationPolicy === 'Fixed'
            ? 'Content not yet provided — will be set during realization.'
            : `${s.materializationPolicy} content: ${s.contentSpecification || 'no specification provided'}`}
        </p>
      ) : null}
    </div>
  )
}

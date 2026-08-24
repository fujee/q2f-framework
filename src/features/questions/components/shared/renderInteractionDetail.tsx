import { CheckCircle2, Circle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { ResponseInteraction } from '@/domain/qd/model'

export function Pill({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground',
        className
      )}
    >
      {children}
    </span>
  )
}

/** Shared type-specific detail rendering for a ResponseInteraction, used by both
 * the wizard's review step and the read-only question detail page. */
export function renderInteractionDetail(ia: ResponseInteraction): ReactNode {
  switch (ia.type) {
    case 'Selecting': {
      return (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            <Pill>
              {ia.minSelections} – {ia.maxSelections} selection(s)
            </Pill>
            <Pill>
              {ia.itemOrderPolicy === 'Fixed' ? 'Fixed order' : 'Shuffled'}
            </Pill>
          </div>
          <ul className="space-y-1">
            {ia.choices.map((c) => (
              <li
                key={c.id}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1 text-xs',
                  c.isCorrect
                    ? 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {c.isCorrect ? (
                  <CheckCircle2 className="size-3 shrink-0" />
                ) : (
                  <Circle className="size-3 shrink-0" />
                )}
                <span className="w-6 font-mono opacity-60">{c.code}</span>
                <span>{c.name || <em>no label</em>}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    }

    case 'Ordering': {
      const idToItem = Object.fromEntries(
        ia.orderingItems.map((it) => [it.id, it])
      )
      return (
        <div className="mt-2 space-y-1.5">
          <Pill>
            {ia.itemOrderPolicy === 'Fixed'
              ? 'Fixed display order'
              : 'Shuffled display'}
          </Pill>
          <p className="text-xs text-muted-foreground">Correct order:</p>
          <ol className="space-y-1">
            {ia.correctOrder.map((id, i) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded bg-muted px-2 py-1 text-xs"
              >
                <span className="w-5 text-center font-medium text-muted-foreground">
                  {i + 1}
                </span>
                <span>{idToItem[id]?.name || idToItem[id]?.code || id}</span>
              </li>
            ))}
          </ol>
        </div>
      )
    }

    case 'Completing': {
      const gaps = ia.completingGaps
      const items = ia.completingItems
      const idToItemLabel = Object.fromEntries(
        items.map((it) => [
          it.id,
          it.type === 'TextCompletingItem' ? it.text : 'Image',
        ])
      )
      return (
        <div className="mt-2 space-y-2">
          {items.length > 0 && (
            <div className="space-y-1 rounded-md border border-border p-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Item Pool ({items.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {items.map((it) => (
                  <span
                    key={it.id}
                    className="rounded-full border border-border bg-card px-2 py-0.5 text-xs"
                  >
                    {it.type === 'TextCompletingItem' ? it.text : 'Image'}
                    <span className="ml-1 text-muted-foreground">
                      ×{it.usageLimit === 'Unlimited' ? '∞' : it.usageLimit}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {gaps.map((g, i) => {
            const isDt = g.type === 'DropTargetGap'
            return (
              <div
                key={g.id}
                className="space-y-1 rounded-md border border-border p-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="font-mono font-medium">{g.code}</span>
                  <Pill>
                    {g.type === 'TextInputGap'
                      ? 'Text'
                      : g.type === 'NumberInputGap'
                        ? 'Number'
                        : g.type === 'DateInputGap'
                          ? 'Date'
                          : 'Drop Target'}
                  </Pill>
                  {g.anchor?.kind === 'TextAnchor' && (
                    <span className="font-mono text-muted-foreground">
                      at {g.anchor.marker}
                    </span>
                  )}
                  {g.anchor?.kind === 'RegionAnchor' && (
                    <span className="text-muted-foreground">
                      at region (x:{g.anchor.x.toFixed(2)} y:
                      {g.anchor.y.toFixed(2)})
                    </span>
                  )}
                  {!g.anchor && g.placementSpecification && (
                    <span className="text-muted-foreground">
                      by specification
                    </span>
                  )}
                </div>
                {(g.type === 'TextInputGap' ||
                  g.type === 'NumberInputGap' ||
                  g.type === 'DateInputGap') &&
                  g.correctValues.length > 0 && (
                    <p className="text-foreground">
                      Answer:{' '}
                      <span className="font-medium">
                        {g.correctValues.join(', ')}
                      </span>
                    </p>
                  )}
                {isDt && g.correctItemRefs.length > 0 && (
                  <p className="text-foreground">
                    Correct:{' '}
                    {g.correctItemRefs
                      .map((ref) => idToItemLabel[ref] ?? ref)
                      .join(', ')}
                  </p>
                )}
                {isDt && g.correctItemRefs.length === 0 && (
                  <p className="italic text-muted-foreground">
                    No correct items set.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    case 'Marking':
      return (
        <p className="mt-2 text-xs text-muted-foreground">
          <Pill>{ia.markType}</Pill> · {ia.minMarks}–{ia.maxMarks} mark(s) ·
          surface defined via the Associations step.
        </p>
      )

    case 'ShortInput':
      return (
        <div className="mt-2 space-y-1">
          <Pill>{ia.inputType} input</Pill>
          {ia.correctValues.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Accepted:{' '}
              <span className="font-medium text-foreground">
                {ia.correctValues.join(', ')}
              </span>
            </p>
          )}
        </div>
      )

    case 'Essay':
      return (
        <p className="mt-2 text-xs text-muted-foreground">
          {ia.maxLength
            ? `Max ${ia.maxLength.toLocaleString()} ${ia.lengthUnit?.toLowerCase() ?? ''}`
            : 'No length limit'}
        </p>
      )

    case 'ArtifactSubmission':
      return (
        <div className="mt-2 space-y-1">
          <Pill>
            {ia.minArtifacts}–{ia.maxArtifacts ?? '∞'} artifact(s)
          </Pill>
          <p className="text-xs text-muted-foreground">
            {ia.artifactSpecification}
          </p>
        </div>
      )

    case 'Relating': {
      const relations = ia.correctRelations
      const idToLabel = Object.fromEntries(
        [
          ...ia.sourceSet.relatingElements,
          ...ia.targetSet.relatingElements,
        ].map((el) => [el.id, el.name || el.code])
      )
      return (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <Pill>{ia.mappingType}</Pill>
            <Pill>Source participation: {ia.sourceParticipationPolicy}</Pill>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[ia.sourceSet, ia.targetSet].map((set, si) => (
              <div key={set.code} className="rounded bg-muted p-2 text-xs">
                <p className="mb-1 font-medium">
                  {set.name || (si === 0 ? 'Source' : 'Target')}
                </p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {set.relatingElements.map((el) => (
                    <li key={el.id}>{el.name || el.code}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {relations.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Correct relations:
              </p>
              {relations.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span className="font-medium text-foreground">
                    {idToLabel[r.sourceElementRef] ?? r.sourceElementRef}
                  </span>
                  <span>→</span>
                  <span className="font-medium text-foreground">
                    {idToLabel[r.targetElementRef] ?? r.targetElementRef}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    default:
      return null
  }
}

import { useMemo, type ReactNode } from 'react'
import type { QuestionDefinition } from '@/domain/qd/model'
import type { LayoutElement, QuestionFormDefinition } from '@/domain/qfd/model'
import {
  anchoredAffordances,
  buildRenderContext,
  indexedLayoutable,
  isLayoutableExposed,
  type RenderContext,
} from './renderContext'
import {
  EffectiveInstruction,
  InteractionWidget,
  StimulusContent,
} from './interactionWidgets'
import { RuntimeProgressProvider, useRuntimeProgress } from './runtimeProgress'

function InteractionUnit({
  ctx,
  interactionRef,
  renderedInteractions,
}: {
  ctx: RenderContext
  interactionRef: string
  renderedInteractions: Set<string>
}): ReactNode {
  const { isAnswerable } = useRuntimeProgress()
  if (renderedInteractions.has(interactionRef)) return null
  renderedInteractions.add(interactionRef)
  const interaction = ctx.interactions.get(interactionRef)
  const realization = ctx.interactionRealizations.get(interactionRef)
  if (!interaction || !realization)
    return (
      <div className="text-xs text-destructive">
        Missing interaction realization
      </div>
    )
  return (
    <div className="qfd-interaction" data-interaction-ref={interactionRef}>
      <InteractionWidget
        interaction={interaction}
        realization={realization}
        disabled={!isAnswerable(interactionRef)}
      />
    </div>
  )
}

function LayoutRenderer({
  ctx,
  layout,
  renderedInteractions,
}: {
  ctx: RenderContext
  layout: LayoutElement
  renderedInteractions: Set<string>
}): ReactNode {
  const { isExposed } = useRuntimeProgress()
  if (layout.kind === 'LayoutGroup') {
    return (
      <div
        className={`qfd-layout flex gap-3 ${layout.orientation === 'Horizontal' ? 'flex-row flex-wrap' : 'flex-col'}`}
        data-orientation={layout.orientation}
      >
        {layout.children.map((child, index) => (
          <LayoutRenderer
            key={index}
            ctx={ctx}
            layout={child}
            renderedInteractions={renderedInteractions}
          />
        ))}
      </div>
    )
  }
  if (!isLayoutableExposed(ctx, layout.realizationRef, isExposed)) return null
  const entry = indexedLayoutable(ctx, layout.realizationRef)
  if (!entry)
    return <div className="text-xs text-destructive">Missing realization</div>

  switch (entry.kind) {
    case 'StimulusRealization': {
      const visibleAffordances = anchoredAffordances(
        ctx,
        entry.value.id
      ).filter((affordance) => isExposed(affordance.interactionRef))
      return (
        <section
          className="qfd-stimulus rounded-md border p-3"
          data-sr-id={entry.value.id}
        >
          <StimulusContent ctx={ctx} realization={entry.value} />
          {visibleAffordances.map((affordance) => (
            <span
              key={`${affordance.interactionRef}:${affordance.kind}:${affordance.elementRef ?? ''}`}
              className="qfd-affordance"
              data-owner-interaction={affordance.interactionRef}
              data-affordance-kind={affordance.kind}
            >
              {affordance.elementRef ?? affordance.kind}
            </span>
          ))}
          {visibleAffordances.map((affordance) => (
            <InteractionUnit
              key={`widget:${affordance.interactionRef}`}
              ctx={ctx}
              interactionRef={affordance.interactionRef}
              renderedInteractions={renderedInteractions}
            />
          ))}
        </section>
      )
    }
    case 'InstructionRealization': {
      const interaction = ctx.interactions.get(entry.ownerInteractionRef)
      const text =
        entry.value.realizedText ??
        (entry.value.role === 'TaskInstruction'
          ? interaction?.instruction
          : undefined)
      return text === undefined ? null : (
        <EffectiveInstruction text={text} role={entry.value.role} />
      )
    }
    case 'ElementPresentation':
      return (
        <span className="qfd-element">
          {entry.value.realizedText ?? entry.value.id}
        </span>
      )
    case 'SelectionPresentation':
    case 'OrderingPresentation':
    case 'RelatingSetPresentation':
    case 'CompletingItemSourceRealization':
    case 'ResponseSiteRealization':
      return (
        <InteractionUnit
          ctx={ctx}
          interactionRef={entry.ownerInteractionRef}
          renderedInteractions={renderedInteractions}
        />
      )
  }
}

function InteractiveForm({ ctx }: { ctx: RenderContext }) {
  const renderedInteractions = new Set<string>()
  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <LayoutRenderer
        ctx={ctx}
        layout={ctx.qfd.rootLayout}
        renderedInteractions={renderedInteractions}
      />
    </div>
  )
}

/** Interactive renderer executes dependency state; static export has a separate explicit boundary. */
export function QfdPreview({
  qd,
  qfd,
}: {
  qd: QuestionDefinition
  qfd: QuestionFormDefinition
}) {
  const ctx = useMemo(() => buildRenderContext(qd, qfd), [qd, qfd])
  return (
    <RuntimeProgressProvider
      qd={qd}
      qfd={qfd}
      responseAcceptance={{
        acceptMarking: (interaction, raw) =>
          Array.isArray(raw) &&
          raw.length >= interaction.minMarks &&
          (interaction.maxMarks === undefined ||
            raw.length <= interaction.maxMarks),
      }}
    >
      <InteractiveForm ctx={ctx} />
    </RuntimeProgressProvider>
  )
}

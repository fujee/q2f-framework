import { useMemo, type ReactNode } from 'react'
import type { QuestionDefinition } from '@/domain/qd/model'
import type {
  LayoutableRealizationRef,
  QuestionFormDefinition,
} from '@/domain/qfd/model'
import { LayoutTree } from './LayoutTree'
import {
  anchoredAffordances,
  buildRenderContext,
  elementPresentationText,
  indexedLayoutable,
  isLayoutableExposed,
  type RenderContext,
} from './renderContext'
import {
  ArtifactResponseSite,
  CompletingItemSelection,
  CompletingItemSource,
  CompletingResponseSite,
  EffectiveInstruction,
  OrderingControl,
  ReferencedSelectionSite,
  RelationNotationSite,
  RelatingSetControl,
  RendererUiProvider,
  ScalarResponseSite,
  StandaloneSelection,
  WorkspaceStimulus,
} from './interactionWidgets'
import { acceptsRendererMarkingResponse } from './markingResponse'
import { RuntimeProgressProvider, useRuntimeProgress } from './runtimeProgress'

function InteractionPlacement({
  interactionRef,
  children,
}: {
  interactionRef: string
  children: ReactNode
}) {
  return (
    <div className="qfd-interaction" data-interaction-ref={interactionRef}>
      {children}
    </div>
  )
}

function RootPlacement({
  ctx,
  realizationRef,
}: {
  ctx: RenderContext
  realizationRef: LayoutableRealizationRef
}): ReactNode {
  const { isAnswerable, isExposed } = useRuntimeProgress()
  if (!isLayoutableExposed(ctx, realizationRef, isExposed)) return null
  const entry = indexedLayoutable(ctx, realizationRef)
  if (!entry)
    return <div className="text-xs text-destructive">Missing realization</div>
  if (entry.kind === 'StimulusRealization') {
    const visibleInteractionRefs = [
      ...new Set(
        anchoredAffordances(ctx, entry.value.id)
          .filter(({ interactionRef }) => isExposed(interactionRef))
          .map(({ interactionRef }) => interactionRef)
      ),
    ]
    return (
      <WorkspaceStimulus
        ctx={ctx}
        realization={entry.value}
        visibleInteractionRefs={visibleInteractionRefs}
      />
    )
  }
  const interactionRef = entry.ownerInteractionRef
  const disabled = !isAnswerable(interactionRef)
  switch (entry.kind) {
    case 'InstructionRealization': {
      const interaction = ctx.interactions.get(interactionRef)
      const text =
        entry.value.realizedText ??
        (entry.value.role === 'TaskInstruction'
          ? interaction?.instruction
          : undefined)
      return text === undefined ? null : (
        <InteractionPlacement interactionRef={interactionRef}>
          <EffectiveInstruction text={text} role={entry.value.role} />
        </InteractionPlacement>
      )
    }
    case 'ElementPresentation':
      return (
        <InteractionPlacement interactionRef={interactionRef}>
          <span className="qfd-element">
            {elementPresentationText(ctx, entry.value)}
          </span>
        </InteractionPlacement>
      )
    case 'SelectionPresentation':
      return (
        <InteractionPlacement interactionRef={interactionRef}>
          {entry.purpose.kind === 'StandaloneSelecting' ? (
            <StandaloneSelection
              ctx={ctx}
              interactionRef={interactionRef}
              presentation={entry.value}
              disabled={disabled}
            />
          ) : (
            <div data-response-placement="Referenced">
              <CompletingItemSelection
                ctx={ctx}
                interactionRef={interactionRef}
                presentation={entry.value}
                gapRef={entry.purpose.gapRef}
                disabled={disabled}
              />
            </div>
          )}
        </InteractionPlacement>
      )
    case 'OrderingPresentation':
      return (
        <InteractionPlacement interactionRef={interactionRef}>
          <OrderingControl
            ctx={ctx}
            interactionRef={interactionRef}
            presentation={entry.value}
            disabled={disabled}
          />
        </InteractionPlacement>
      )
    case 'RelatingSetPresentation':
      return (
        <InteractionPlacement interactionRef={interactionRef}>
          <RelatingSetControl
            ctx={ctx}
            interactionRef={interactionRef}
            presentation={entry.value}
            set={entry.set}
            disabled={disabled}
          />
        </InteractionPlacement>
      )
    case 'CompletingItemSourceRealization':
      return (
        <InteractionPlacement interactionRef={interactionRef}>
          <CompletingItemSource
            ctx={ctx}
            interactionRef={interactionRef}
            source={entry.value}
            disabled={disabled}
          />
        </InteractionPlacement>
      )
    case 'ResponseSiteRealization': {
      let control: ReactNode
      switch (entry.purpose.kind) {
        case 'SelectingReferenced':
          control = (
            <ReferencedSelectionSite
              ctx={ctx}
              interactionRef={interactionRef}
              site={entry.value}
              stimulusRealizationRef={entry.purpose.stimulusRealizationRef}
              disabled={disabled}
            />
          )
          break
        case 'RelatingNotation':
          control = (
            <RelationNotationSite
              ctx={ctx}
              interactionRef={interactionRef}
              site={entry.value}
              disabled={disabled}
            />
          )
          break
        case 'CompletingInput':
        case 'CompletingPlacement':
          control = (
            <CompletingResponseSite
              ctx={ctx}
              interactionRef={interactionRef}
              site={entry.value}
              gapRef={entry.purpose.gapRef}
              purpose={
                entry.purpose.kind === 'CompletingInput' ? 'Input' : 'Placement'
              }
              disabled={disabled}
            />
          )
          break
        case 'ShortInput':
        case 'Essay':
          control = (
            <ScalarResponseSite
              interactionRef={interactionRef}
              site={entry.value}
              kind={
                entry.purpose.kind === 'ShortInput' ? 'ShortInput' : 'Essay'
              }
              disabled={disabled}
            />
          )
          break
        case 'ArtifactSubmission':
          control = (
            <ArtifactResponseSite
              ctx={ctx}
              interactionRef={interactionRef}
              site={entry.value}
              disabled={disabled}
            />
          )
          break
      }
      return (
        <InteractionPlacement interactionRef={interactionRef}>
          {control}
        </InteractionPlacement>
      )
    }
  }
}

function InteractiveForm({ ctx }: { ctx: RenderContext }) {
  return (
    <RendererUiProvider>
      <div className="space-y-3 rounded-lg border border-border bg-background p-4">
        <LayoutTree
          layout={ctx.qfd.rootLayout}
          renderPlacement={(realizationRef) => (
            <RootPlacement ctx={ctx} realizationRef={realizationRef} />
          )}
        />
      </div>
    </RendererUiProvider>
  )
}

/** Interactive renderer executes concrete QFD dependency and response behavior. */
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
        acceptMarking: (interaction, raw) => {
          const realization = ctx.interactionRealizations.get(interaction.id)
          return (
            realization?.type === 'MarkingRealization' &&
            acceptsRendererMarkingResponse(interaction, realization, raw)
          )
        },
      }}
    >
      <InteractiveForm ctx={ctx} />
    </RuntimeProgressProvider>
  )
}

import {
  createContext,
  useContext,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import type { ResponseInteraction } from '@/domain/qd/model'
import type {
  CompletingItemSourceRealization,
  ElementPresentation,
  OrderingPresentation,
  RelatingSetPresentation,
  ResponseSiteRealization,
  SelectionPresentation,
  StimulusRealization,
} from '@/domain/qfd/model'
import { LayoutTree } from './LayoutTree'
import {
  appendPointMark,
  appendTextSpanMark,
  type RendererMarkingResponse,
} from './markingResponse'
import { moveOrderingItem } from './orderingResponse'
import {
  elementPresentationSemanticRef,
  elementPresentationText,
  indexedLayoutable,
  localPresentationRef,
  orderedLocalElementPresentations,
  resolveRealizedStimulusContent,
  type LocalPresentationScope,
  type RenderContext,
} from './renderContext'
import { useRuntimeProgress } from './runtimeProgress'

interface RendererUiValue {
  relatingSource: Record<string, string | undefined>
  setRelatingSource: (interactionRef: string, sourceRef: string) => void
  completingItem: Record<string, string | undefined>
  setCompletingItem: (interactionRef: string, itemRef: string) => void
}

const RendererUiContext = createContext<RendererUiValue | null>(null)

export function RendererUiProvider({ children }: { children: ReactNode }) {
  const [relatingSource, setRelatingSources] = useState<
    Record<string, string | undefined>
  >({})
  const [completingItem, setCompletingItems] = useState<
    Record<string, string | undefined>
  >({})
  return (
    <RendererUiContext.Provider
      value={{
        relatingSource,
        setRelatingSource: (interactionRef, sourceRef) =>
          setRelatingSources((previous) => ({
            ...previous,
            [interactionRef]: sourceRef,
          })),
        completingItem,
        setCompletingItem: (interactionRef, itemRef) =>
          setCompletingItems((previous) => ({
            ...previous,
            [interactionRef]: itemRef,
          })),
      }}
    >
      {children}
    </RendererUiContext.Provider>
  )
}

function useRendererUi(): RendererUiValue {
  const value = useContext(RendererUiContext)
  if (!value) throw new Error('Renderer controls require RendererUiProvider')
  return value
}

export function EffectiveInstruction({
  text,
  role,
}: {
  text: string
  role: 'TaskInstruction' | 'OperationalGuidance'
}) {
  return (
    <div
      className={
        role === 'TaskInstruction'
          ? 'qfd-instruction'
          : 'qfd-operational-guidance'
      }
      data-instruction-role={role}
    >
      {text}
    </div>
  )
}

export function StimulusContent({
  ctx,
  realization,
}: {
  ctx: RenderContext
  realization: StimulusRealization
}) {
  const stimulus = ctx.stimuli.get(realization.stimulusRef)
  if (!stimulus) return null
  const content = resolveRealizedStimulusContent(stimulus, realization)
  if (!content)
    return (
      <div className="qfd-stimulus-content-unavailable">
        Content unavailable
      </div>
    )
  switch (realization.realizedModality) {
    case 'Text':
      return <div className="whitespace-pre-wrap">{content}</div>
    case 'Image':
      return (
        <img
          src={content}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      )
    case 'Audio':
      return <audio controls src={content} />
    case 'Video':
      return <video controls src={content} />
  }
}

function LocalPresentationLayout({
  ctx,
  scope,
  renderElement,
}: {
  ctx: RenderContext
  scope: LocalPresentationScope
  renderElement: (element: ElementPresentation) => ReactNode
}) {
  const scopeRef = localPresentationRef(scope)
  return (
    <LayoutTree
      layout={scope.value.localLayout}
      renderPlacement={(ref) => {
        const entry = indexedLayoutable(ctx, ref, scopeRef)
        return entry?.kind === 'ElementPresentation'
          ? renderElement(entry.value)
          : null
      }}
    />
  )
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function responseRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function setSelection(
  current: readonly string[],
  choiceRef: string,
  checked: boolean,
  maxSelections: number
): string[] {
  if (maxSelections === 1) return checked ? [choiceRef] : []
  if (!checked) return current.filter((id) => id !== choiceRef)
  if (current.includes(choiceRef) || current.length >= maxSelections)
    return [...current]
  return [...current, choiceRef]
}

function SelectionPresentationControl({
  ctx,
  interaction,
  presentation,
  gapRef,
  disabled,
}: {
  ctx: RenderContext
  interaction:
    | Extract<ResponseInteraction, { type: 'Selecting' }>
    | Extract<ResponseInteraction, { type: 'Completing' }>
  presentation: SelectionPresentation
  gapRef?: string
  disabled: boolean
}) {
  const { responses, setResponse } = useRuntimeProgress()
  const current =
    interaction.type === 'Selecting'
      ? stringArray(responses[interaction.id])
      : String(responseRecord(responses[interaction.id])[gapRef ?? ''] ?? '')
  const presentations = orderedLocalElementPresentations(ctx, {
    kind: 'SelectionPresentation',
    value: presentation,
  })
  const update = (itemRef: string, checked: boolean) => {
    if (interaction.type === 'Selecting') {
      const selected = Array.isArray(current) ? current : []
      setResponse(
        interaction.id,
        setSelection(selected, itemRef, checked, interaction.maxSelections)
      )
      return
    }
    setResponse(interaction.id, {
      ...responseRecord(responses[interaction.id]),
      [gapRef ?? '']: checked ? itemRef : '',
    })
  }
  if (presentation.mode === 'Collapsed')
    return (
      <select
        aria-label={gapRef ? `Complete ${gapRef}` : 'Select response'}
        data-selection-mode="Collapsed"
        disabled={disabled}
        multiple={
          interaction.type === 'Selecting' && interaction.maxSelections > 1
        }
        value={current}
        onChange={(event) => {
          if (interaction.type === 'Selecting') {
            const next = [...event.currentTarget.selectedOptions].map(
              ({ value }) => value
            )
            setResponse(
              interaction.id,
              next.slice(0, interaction.maxSelections)
            )
          } else update(event.currentTarget.value, true)
        }}
      >
        {interaction.type === 'Completing' ? (
          <option value="">Choose…</option>
        ) : null}
        {presentations.map((element) => (
          <option
            key={element.id}
            value={elementPresentationSemanticRef(element)}
          >
            {elementPresentationText(ctx, element)}
          </option>
        ))}
      </select>
    )
  return (
    <fieldset disabled={disabled} data-selection-mode="Expanded">
      <LocalPresentationLayout
        ctx={ctx}
        scope={{ kind: 'SelectionPresentation', value: presentation }}
        renderElement={(element) => {
          const itemRef = elementPresentationSemanticRef(element)
          const checked =
            typeof current === 'string'
              ? current === itemRef
              : current.includes(itemRef)
          return (
            <label className="qfd-option" data-element-id={element.id}>
              <input
                type={
                  interaction.type === 'Selecting' &&
                  interaction.maxSelections > 1
                    ? 'checkbox'
                    : 'radio'
                }
                name={gapRef ?? interaction.id}
                checked={checked}
                onChange={(event) =>
                  update(itemRef, event.currentTarget.checked)
                }
              />
              {elementPresentationText(ctx, element)}
            </label>
          )
        }}
      />
    </fieldset>
  )
}

export function StandaloneSelection({
  ctx,
  interactionRef,
  presentation,
  disabled,
}: {
  ctx: RenderContext
  interactionRef: string
  presentation: SelectionPresentation
  disabled: boolean
}) {
  const interaction = ctx.interactions.get(interactionRef)
  return interaction?.type === 'Selecting' ? (
    <SelectionPresentationControl
      ctx={ctx}
      interaction={interaction}
      presentation={presentation}
      disabled={disabled}
    />
  ) : null
}

export function CompletingItemSelection({
  ctx,
  interactionRef,
  presentation,
  gapRef,
  disabled,
}: {
  ctx: RenderContext
  interactionRef: string
  presentation: SelectionPresentation
  gapRef: string
  disabled: boolean
}) {
  const interaction = ctx.interactions.get(interactionRef)
  return interaction?.type === 'Completing' ? (
    <SelectionPresentationControl
      ctx={ctx}
      interaction={interaction}
      presentation={presentation}
      gapRef={gapRef}
      disabled={disabled}
    />
  ) : null
}

export function OrderingControl({
  ctx,
  interactionRef,
  presentation,
  disabled,
}: {
  ctx: RenderContext
  interactionRef: string
  presentation: OrderingPresentation
  disabled: boolean
}) {
  const interaction = ctx.interactions.get(interactionRef)
  const realization = ctx.interactionRealizations.get(interactionRef)
  const { responses, setResponse } = useRuntimeProgress()
  const [ranks, setRanks] = useState<Record<string, string>>({})
  if (
    interaction?.type !== 'Ordering' ||
    realization?.type !== 'OrderingRealization'
  )
    return null
  const presented = orderedLocalElementPresentations(ctx, {
    kind: 'OrderingPresentation',
    value: presentation,
  })
  const initialOrder = presented.map(elementPresentationSemanticRef)
  const order = stringArray(responses[interactionRef])
  const currentOrder =
    order.length === initialOrder.length ? order : initialOrder
  const byRef = new Map(
    presented.map((element) => [
      elementPresentationSemanticRef(element),
      element,
    ])
  )
  if (realization.mode === 'DirectOrdering')
    return (
      <div data-ordering-mode="DirectOrdering">
        <LocalPresentationLayout
          ctx={ctx}
          scope={{ kind: 'OrderingPresentation', value: presentation }}
          renderElement={(slot) => {
            const index = presented.indexOf(slot)
            const itemRef = currentOrder[index]
            const element = byRef.get(itemRef)
            if (!element) return null
            return (
              <div className="qfd-element" data-element-id={element.id}>
                {elementPresentationText(ctx, element)}
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  aria-label={`Move ${itemRef} up`}
                  onClick={() =>
                    setResponse(
                      interactionRef,
                      moveOrderingItem(currentOrder, itemRef, -1)
                    )
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={disabled || index === currentOrder.length - 1}
                  aria-label={`Move ${itemRef} down`}
                  onClick={() =>
                    setResponse(
                      interactionRef,
                      moveOrderingItem(currentOrder, itemRef, 1)
                    )
                  }
                >
                  ↓
                </button>
              </div>
            )
          }}
        />
      </div>
    )
  return (
    <div data-ordering-mode="OrderNotation">
      <LocalPresentationLayout
        ctx={ctx}
        scope={{ kind: 'OrderingPresentation', value: presentation }}
        renderElement={(element) => {
          const itemRef = elementPresentationSemanticRef(element)
          return (
            <label className="qfd-element" data-element-id={element.id}>
              {elementPresentationText(ctx, element)}
              <input
                type="number"
                min={1}
                max={presented.length}
                disabled={disabled}
                aria-label={`Rank ${itemRef}`}
                value={ranks[itemRef] ?? ''}
                onChange={(event) => {
                  const next = {
                    ...ranks,
                    [itemRef]: event.currentTarget.value,
                  }
                  setRanks(next)
                  const ranked = presented.map((candidate) => {
                    const ref = elementPresentationSemanticRef(candidate)
                    return { itemRef: ref, rank: Number(next[ref]) }
                  })
                  const allValid =
                    ranked.every(
                      ({ rank }) =>
                        Number.isInteger(rank) &&
                        rank >= 1 &&
                        rank <= presented.length
                    ) &&
                    new Set(ranked.map(({ rank }) => rank)).size ===
                      ranked.length
                  setResponse(
                    interactionRef,
                    allValid
                      ? ranked
                          .sort((left, right) => left.rank - right.rank)
                          .map(({ itemRef: ref }) => ref)
                      : undefined
                  )
                }}
              />
            </label>
          )
        }}
      />
    </div>
  )
}

function relationPairs(value: unknown): Array<{
  sourceElementRef: string
  targetElementRef: string
}> {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is { sourceElementRef: string; targetElementRef: string } =>
      typeof item === 'object' &&
      item !== null &&
      'sourceElementRef' in item &&
      typeof item.sourceElementRef === 'string' &&
      'targetElementRef' in item &&
      typeof item.targetElementRef === 'string'
  )
}

export function RelatingSetControl({
  ctx,
  interactionRef,
  presentation,
  set,
  disabled,
}: {
  ctx: RenderContext
  interactionRef: string
  presentation: RelatingSetPresentation
  set: 'Source' | 'Target'
  disabled: boolean
}) {
  const interaction = ctx.interactions.get(interactionRef)
  const realization = ctx.interactionRealizations.get(interactionRef)
  const { responses, setResponse } = useRuntimeProgress()
  const ui = useRendererUi()
  if (
    interaction?.type !== 'Relating' ||
    realization?.type !== 'RelatingRealization'
  )
    return null
  const scientificSet =
    set === 'Source' ? interaction.sourceSet : interaction.targetSet
  const label = presentation.realizedLabel ?? scientificSet.label
  return (
    <section
      className="qfd-relating-set"
      data-relating-mode={realization.mode}
      data-relating-set={set}
    >
      {label ? <h4>{label}</h4> : null}
      <LocalPresentationLayout
        ctx={ctx}
        scope={{ kind: 'RelatingSetPresentation', value: presentation }}
        renderElement={(element) => {
          const elementRef = elementPresentationSemanticRef(element)
          if (realization.mode === 'RelationNotation')
            return (
              <span className="qfd-element" data-element-id={element.id}>
                {elementPresentationText(ctx, element)}
              </span>
            )
          const selected =
            set === 'Source' && ui.relatingSource[interactionRef] === elementRef
          return (
            <button
              type="button"
              className="qfd-element"
              data-element-id={element.id}
              data-selected={selected || undefined}
              disabled={
                disabled ||
                (set === 'Target' && !ui.relatingSource[interactionRef])
              }
              onClick={() => {
                if (set === 'Source') {
                  ui.setRelatingSource(interactionRef, elementRef)
                  return
                }
                const sourceElementRef = ui.relatingSource[interactionRef]
                if (!sourceElementRef) return
                setResponse(interactionRef, [
                  ...relationPairs(responses[interactionRef]),
                  { sourceElementRef, targetElementRef: elementRef },
                ])
              }}
            >
              {elementPresentationText(ctx, element)}
            </button>
          )
        }}
      />
    </section>
  )
}

export function RelationNotationSite({
  ctx,
  interactionRef,
  site,
  disabled,
}: {
  ctx: RenderContext
  interactionRef: string
  site: ResponseSiteRealization
  disabled: boolean
}) {
  const interaction = ctx.interactions.get(interactionRef)
  const realization = ctx.interactionRealizations.get(interactionRef)
  const { responses, setResponse } = useRuntimeProgress()
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  if (
    interaction?.type !== 'Relating' ||
    realization?.type !== 'RelatingRealization'
  )
    return null
  const sourceElements = orderedLocalElementPresentations(ctx, {
    kind: 'RelatingSetPresentation',
    value: realization.sourceSetPresentation,
  })
  const targetElements = orderedLocalElementPresentations(ctx, {
    kind: 'RelatingSetPresentation',
    value: realization.targetSetPresentation,
  })
  return (
    <div
      className="qfd-response-site"
      data-response-site-id={site.id}
      data-relating-mode="RelationNotation"
    >
      <select
        aria-label="Relation source notation"
        disabled={disabled}
        value={source}
        onChange={(event) => setSource(event.currentTarget.value)}
      >
        <option value="">Source…</option>
        {sourceElements.map((element) => (
          <option
            key={element.id}
            value={elementPresentationSemanticRef(element)}
          >
            {elementPresentationText(ctx, element)}
          </option>
        ))}
      </select>
      <select
        aria-label="Relation target notation"
        disabled={disabled}
        value={target}
        onChange={(event) => setTarget(event.currentTarget.value)}
      >
        <option value="">Target…</option>
        {targetElements.map((element) => (
          <option
            key={element.id}
            value={elementPresentationSemanticRef(element)}
          >
            {elementPresentationText(ctx, element)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={disabled || !source || !target}
        onClick={() =>
          setResponse(interactionRef, [
            ...relationPairs(responses[interactionRef]),
            { sourceElementRef: source, targetElementRef: target },
          ])
        }
      >
        Add relation notation
      </button>
    </div>
  )
}

export function CompletingItemSource({
  ctx,
  interactionRef,
  source,
  disabled,
}: {
  ctx: RenderContext
  interactionRef: string
  source: CompletingItemSourceRealization
  disabled: boolean
}) {
  const interaction = ctx.interactions.get(interactionRef)
  const ui = useRendererUi()
  if (interaction?.type !== 'Completing') return null
  return (
    <section className="qfd-item-source" data-assignment-mode="DirectPlacement">
      <strong>Options:</strong>
      <LocalPresentationLayout
        ctx={ctx}
        scope={{ kind: 'CompletingItemSourceRealization', value: source }}
        renderElement={(element) => {
          const itemRef = elementPresentationSemanticRef(element)
          return (
            <button
              type="button"
              className="qfd-element"
              data-element-id={element.id}
              data-selected={
                ui.completingItem[interactionRef] === itemRef || undefined
              }
              disabled={disabled}
              onClick={() => ui.setCompletingItem(interactionRef, itemRef)}
            >
              {elementPresentationText(ctx, element)}
            </button>
          )
        }}
      />
    </section>
  )
}

function updateGapResponse(
  responses: Record<string, unknown>,
  setResponse: (interactionRef: string, raw: unknown) => void,
  interactionRef: string,
  gapRef: string,
  value: unknown
) {
  setResponse(interactionRef, {
    ...responseRecord(responses[interactionRef]),
    [gapRef]: value,
  })
}

export function ScalarResponseSite({
  interactionRef,
  site,
  kind,
  disabled,
}: {
  interactionRef: string
  site: ResponseSiteRealization
  kind: 'ShortInput' | 'Essay'
  disabled: boolean
}) {
  const { setResponse } = useRuntimeProgress()
  return (
    <div className="qfd-response-site" data-response-site-id={site.id}>
      {kind === 'Essay' ? (
        <textarea
          disabled={disabled}
          aria-label="Essay response"
          onChange={(event) =>
            setResponse(interactionRef, event.currentTarget.value)
          }
        />
      ) : (
        <input
          disabled={disabled}
          aria-label="Short response"
          onChange={(event) =>
            setResponse(interactionRef, event.currentTarget.value)
          }
        />
      )}
    </div>
  )
}

export function ArtifactResponseSite({
  ctx,
  interactionRef,
  site,
  disabled,
}: {
  ctx: RenderContext
  interactionRef: string
  site: ResponseSiteRealization
  disabled: boolean
}) {
  const realization = ctx.interactionRealizations.get(interactionRef)
  const { setResponse } = useRuntimeProgress()
  if (realization?.type !== 'ArtifactSubmissionRealization') return null
  return (
    <div className="qfd-response-site" data-response-site-id={site.id}>
      {realization.submissionMode === 'PhysicalSubmission' ? (
        'Physical submission required'
      ) : (
        <input
          disabled={disabled}
          type="file"
          aria-label="Artifact submission"
          multiple
          onChange={(event) =>
            setResponse(
              interactionRef,
              [...(event.currentTarget.files ?? [])].map((file) => file.name)
            )
          }
        />
      )}
    </div>
  )
}

export function CompletingResponseSite({
  interactionRef,
  site,
  gapRef,
  purpose,
  disabled,
}: {
  ctx: RenderContext
  interactionRef: string
  site: ResponseSiteRealization
  gapRef: string
  purpose: 'Input' | 'Placement'
  disabled: boolean
}) {
  const { responses, setResponse } = useRuntimeProgress()
  const ui = useRendererUi()
  const selectedItem = ui.completingItem[interactionRef]
  return (
    <div
      className="qfd-response-site"
      data-response-site-id={site.id}
      data-gap-ref={gapRef}
      data-response-placement="Referenced"
    >
      {purpose === 'Input' ? (
        <input
          disabled={disabled}
          aria-label={`Complete ${gapRef}`}
          onChange={(event) =>
            updateGapResponse(
              responses,
              setResponse,
              interactionRef,
              gapRef,
              event.currentTarget.value
            )
          }
        />
      ) : (
        <button
          type="button"
          disabled={disabled || !selectedItem}
          onClick={() =>
            updateGapResponse(
              responses,
              setResponse,
              interactionRef,
              gapRef,
              selectedItem
            )
          }
        >
          Place selected item at {gapRef}
        </button>
      )}
    </div>
  )
}

export function ReferencedSelectionSite({
  ctx,
  interactionRef,
  site,
  stimulusRealizationRef,
  disabled,
}: {
  ctx: RenderContext
  interactionRef: string
  site: ResponseSiteRealization
  stimulusRealizationRef: string
  disabled: boolean
}) {
  const interaction = ctx.interactions.get(interactionRef)
  const realization = ctx.interactionRealizations.get(interactionRef)
  const { responses, setResponse } = useRuntimeProgress()
  if (
    interaction?.type !== 'Selecting' ||
    realization?.type !== 'SelectingRealization'
  )
    return null
  const workspace = realization.workspaceRealizations.find(
    (candidate) => candidate.stimulusRealizationRef === stimulusRealizationRef
  )
  if (!workspace) return null
  const selected = stringArray(responses[interactionRef])
  return (
    <fieldset
      className="qfd-response-site"
      data-response-site-id={site.id}
      data-selection-mode="ReferencedSelection"
      disabled={disabled}
    >
      {workspace.choiceRealizations.map(({ choiceRef }) => {
        const choice = interaction.choices.find(({ id }) => id === choiceRef)
        const checked = selected.includes(choiceRef)
        return (
          <label className="qfd-option" key={choiceRef}>
            <input
              type={interaction.maxSelections === 1 ? 'radio' : 'checkbox'}
              checked={checked}
              onChange={(event) =>
                setResponse(
                  interactionRef,
                  setSelection(
                    selected,
                    choiceRef,
                    event.currentTarget.checked,
                    interaction.maxSelections
                  )
                )
              }
            />
            {choiceRef}: {choice?.semanticContent ?? choiceRef}
          </label>
        )
      })}
    </fieldset>
  )
}

function WorkspaceSelectingControls({
  ctx,
  realizationRef,
  interactionRef,
  disabled,
}: {
  ctx: RenderContext
  realizationRef: string
  interactionRef: string
  disabled: boolean
}) {
  const interaction = ctx.interactions.get(interactionRef)
  const realization = ctx.interactionRealizations.get(interactionRef)
  const { responses, setResponse } = useRuntimeProgress()
  if (
    interaction?.type !== 'Selecting' ||
    realization?.type !== 'SelectingRealization'
  )
    return null
  const workspace = realization.workspaceRealizations.find(
    (candidate) => candidate.stimulusRealizationRef === realizationRef
  )
  if (!workspace) return null
  const selected = stringArray(responses[interactionRef])
  if (workspace.mode === 'ReferencedSelection')
    return (
      <div data-selection-mode="ReferencedSelection">
        {workspace.choiceRealizations.map(
          ({ choiceRef, realizationAnchor }) => (
            <span
              className="qfd-affordance"
              data-owner-interaction={interactionRef}
              data-choice-ref={choiceRef}
              data-anchor-kind={realizationAnchor?.kind}
              key={choiceRef}
            >
              {choiceRef}
            </span>
          )
        )}
      </div>
    )
  return (
    <div data-selection-mode="DirectSelection">
      {workspace.choiceRealizations.map(({ choiceRef, realizationAnchor }) => {
        const choice = interaction.choices.find(({ id }) => id === choiceRef)
        const checked = selected.includes(choiceRef)
        return (
          <button
            type="button"
            className="qfd-affordance"
            data-owner-interaction={interactionRef}
            data-choice-ref={choiceRef}
            data-anchor-kind={realizationAnchor?.kind}
            aria-pressed={checked}
            disabled={disabled}
            key={choiceRef}
            onClick={() =>
              setResponse(
                interactionRef,
                setSelection(
                  selected,
                  choiceRef,
                  !checked,
                  interaction.maxSelections
                )
              )
            }
          >
            {choice?.semanticContent ?? choiceRef}
          </button>
        )
      })}
    </div>
  )
}

function WorkspaceCompletingControls({
  ctx,
  realizationRef,
  interactionRef,
  disabled,
}: {
  ctx: RenderContext
  realizationRef: string
  interactionRef: string
  disabled: boolean
}) {
  const interaction = ctx.interactions.get(interactionRef)
  const realization = ctx.interactionRealizations.get(interactionRef)
  const { responses, setResponse } = useRuntimeProgress()
  const ui = useRendererUi()
  if (
    interaction?.type !== 'Completing' ||
    realization?.type !== 'CompletingRealization'
  )
    return null
  return (
    <div data-workspace-completing={interactionRef}>
      {realization.gapRealizations
        .filter((gap) => gap.stimulusRealizationRef === realizationRef)
        .map((gap) => {
          if (gap.responsePlacement === 'Referenced')
            return (
              <span
                className="qfd-affordance"
                data-gap-ref={gap.gapRef}
                key={gap.gapRef}
              >
                Response reference: {gap.gapRef}
              </span>
            )
          if (gap.type === 'InputGapRealization')
            return (
              <input
                className="qfd-affordance"
                data-gap-ref={gap.gapRef}
                data-response-placement="Embedded"
                aria-label={`Complete ${gap.gapRef}`}
                disabled={disabled}
                key={gap.gapRef}
                onChange={(event) =>
                  updateGapResponse(
                    responses,
                    setResponse,
                    interactionRef,
                    gap.gapRef,
                    event.currentTarget.value
                  )
                }
              />
            )
          if (
            gap.assignmentMode === 'ItemSelection' &&
            gap.selectionPresentation
          )
            return (
              <div
                className="qfd-affordance"
                data-gap-ref={gap.gapRef}
                data-response-placement="Embedded"
                key={gap.gapRef}
              >
                <CompletingItemSelection
                  ctx={ctx}
                  interactionRef={interactionRef}
                  presentation={gap.selectionPresentation}
                  gapRef={gap.gapRef}
                  disabled={disabled}
                />
              </div>
            )
          const selectedItem = ui.completingItem[interactionRef]
          return (
            <button
              type="button"
              className="qfd-affordance"
              data-gap-ref={gap.gapRef}
              data-assignment-mode="DirectPlacement"
              disabled={disabled || !selectedItem}
              key={gap.gapRef}
              onClick={() =>
                updateGapResponse(
                  responses,
                  setResponse,
                  interactionRef,
                  gap.gapRef,
                  selectedItem
                )
              }
            >
              Place selected item at {gap.gapRef}
            </button>
          )
        })}
    </div>
  )
}

function WorkspaceMarkingSurface({
  ctx,
  realization,
  interactionRefs,
  disabled,
}: {
  ctx: RenderContext
  realization: StimulusRealization
  interactionRefs: readonly string[]
  disabled: (interactionRef: string) => boolean
}) {
  const { setResponse } = useRuntimeProgress()
  const [responses, setResponses] = useState<
    Record<string, RendererMarkingResponse | undefined>
  >({})
  const entries = interactionRefs.flatMap((interactionRef) => {
    const interaction = ctx.interactions.get(interactionRef)
    const qfdRealization = ctx.interactionRealizations.get(interactionRef)
    return interaction?.type === 'Marking' &&
      qfdRealization?.type === 'MarkingRealization'
      ? [{ interaction, realization: qfdRealization }]
      : []
  })
  const report = (interactionRef: string, next: RendererMarkingResponse) => {
    setResponses((previous) => ({ ...previous, [interactionRef]: next }))
    setResponse(interactionRef, next)
  }
  const point = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    entries.forEach(({ interaction, realization: marking }) => {
      if (interaction.markType !== 'Point' || disabled(interaction.id)) return
      const next = appendPointMark(
        responses[interaction.id],
        marking.workspaceRealizationRef,
        event.clientX - bounds.left,
        event.clientY - bounds.top
      )
      if (
        interaction.maxMarks === undefined ||
        next.marks.length <= interaction.maxMarks
      )
        report(interaction.id, next)
    })
  }
  const textSpan = () => {
    const selectedText =
      typeof window === 'undefined'
        ? ''
        : (window.getSelection()?.toString() ?? '')
    if (!selectedText.trim()) return
    entries.forEach(({ interaction, realization: marking }) => {
      if (interaction.markType !== 'TextSpan' || disabled(interaction.id))
        return
      const next = appendTextSpanMark(
        responses[interaction.id],
        marking.workspaceRealizationRef,
        selectedText
      )
      if (
        interaction.maxMarks === undefined ||
        next.marks.length <= interaction.maxMarks
      )
        report(interaction.id, next)
    })
  }
  return (
    <div
      data-renderer-marking-surface="true"
      data-workspace-realization-ref={realization.id}
      onClick={point}
      onMouseUp={textSpan}
    >
      <StimulusContent ctx={ctx} realization={realization} />
      {entries.map(({ interaction }) =>
        interaction.markType === 'Region' ? (
          <div
            className="qfd-marking-unsupported"
            data-owner-interaction={interaction.id}
            key={interaction.id}
          >
            Region marking is not supported by this reference renderer.
          </div>
        ) : (
          <div
            className="qfd-marking-guidance"
            data-owner-interaction={interaction.id}
            data-mark-type={interaction.markType}
            key={interaction.id}
          >
            {interaction.markType === 'Point'
              ? 'Click the workspace to place a point.'
              : 'Select text in the workspace to add a span.'}
          </div>
        )
      )}
    </div>
  )
}

export function WorkspaceStimulus({
  ctx,
  realization,
  visibleInteractionRefs,
}: {
  ctx: RenderContext
  realization: StimulusRealization
  visibleInteractionRefs: readonly string[]
}) {
  const { isAnswerable } = useRuntimeProgress()
  const markingRefs = visibleInteractionRefs.filter(
    (ref) => ctx.interactions.get(ref)?.type === 'Marking'
  )
  return (
    <section
      className="qfd-stimulus rounded-md border p-3"
      data-sr-id={realization.id}
      data-modality={realization.realizedModality}
    >
      {markingRefs.length > 0 ? (
        <WorkspaceMarkingSurface
          ctx={ctx}
          realization={realization}
          interactionRefs={markingRefs}
          disabled={(ref) => !isAnswerable(ref)}
        />
      ) : (
        <StimulusContent ctx={ctx} realization={realization} />
      )}
      {visibleInteractionRefs.map((interactionRef) => {
        const type = ctx.interactions.get(interactionRef)?.type
        if (type === 'Selecting')
          return (
            <WorkspaceSelectingControls
              ctx={ctx}
              realizationRef={realization.id}
              interactionRef={interactionRef}
              disabled={!isAnswerable(interactionRef)}
              key={interactionRef}
            />
          )
        if (type === 'Completing')
          return (
            <WorkspaceCompletingControls
              ctx={ctx}
              realizationRef={realization.id}
              interactionRef={interactionRef}
              disabled={!isAnswerable(interactionRef)}
              key={interactionRef}
            />
          )
        return null
      })}
    </section>
  )
}

import type {
  CompletingGap,
  Content,
  QuestionDefinition,
  ResponseInteraction,
  Stimulus,
} from '@/domain/qd/model'
import type {
  CompletingItemSourceRealization,
  ElementPresentation,
  InstructionRealization,
  InteractionRealization,
  LayoutableRealizationRef,
  OrderingPresentation,
  QuestionFormDefinition,
  RelatingSetPresentation,
  ResponseSiteRealization,
  SelectionPresentation,
  StimulusRealization,
} from '@/domain/qfd/model'
import { layoutableRefKey } from '@/domain/qfd/layout'
import type { ReactNode } from 'react'

export type IndexedLayoutable =
  | { kind: 'StimulusRealization'; value: StimulusRealization }
  | {
      kind: 'InstructionRealization'
      value: InstructionRealization
      ownerInteractionRef: string
    }
  | {
      kind: 'ElementPresentation'
      value: ElementPresentation
      ownerInteractionRef: string
    }
  | {
      kind: 'SelectionPresentation'
      value: SelectionPresentation
      ownerInteractionRef: string
      purpose:
        | { kind: 'StandaloneSelecting' }
        | { kind: 'CompletingItemSelection'; gapRef: string }
    }
  | {
      kind: 'OrderingPresentation'
      value: OrderingPresentation
      ownerInteractionRef: string
    }
  | {
      kind: 'RelatingSetPresentation'
      value: RelatingSetPresentation
      ownerInteractionRef: string
      set: 'Source' | 'Target'
    }
  | {
      kind: 'CompletingItemSourceRealization'
      value: CompletingItemSourceRealization
      ownerInteractionRef: string
    }
  | {
      kind: 'ResponseSiteRealization'
      value: ResponseSiteRealization
      ownerInteractionRef: string
      purpose:
        | { kind: 'SelectingReferenced'; stimulusRealizationRef: string }
        | { kind: 'RelatingNotation' }
        | { kind: 'CompletingInput'; gapRef: string }
        | { kind: 'CompletingPlacement'; gapRef: string }
        | { kind: 'ShortInput' }
        | { kind: 'Essay' }
        | { kind: 'ArtifactSubmission' }
    }

export interface RenderContext {
  qd: QuestionDefinition
  qfd: QuestionFormDefinition
  interactions: Map<string, ResponseInteraction>
  interactionRealizations: Map<string, InteractionRealization>
  stimuli: Map<string, Stimulus>
  stimulusRealizations: Map<string, StimulusRealization>
  layoutables: Map<string, IndexedLayoutable>
  localElementPresentations: Map<string, Map<string, IndexedLayoutable>>
  gaps: Map<string, { interactionRef: string; gap: CompletingGap }>
}

function put(
  map: Map<string, IndexedLayoutable>,
  entry: IndexedLayoutable
): void {
  map.set(layoutableRefKey({ kind: entry.kind, id: entry.value.id }), entry)
}

function indexElements(
  localMaps: Map<string, Map<string, IndexedLayoutable>>,
  scope: LayoutableRealizationRef,
  ownerInteractionRef: string,
  elements: readonly ElementPresentation[]
): void {
  const local = new Map<string, IndexedLayoutable>()
  elements.forEach((value) => {
    const entry: IndexedLayoutable = {
      kind: 'ElementPresentation',
      value,
      ownerInteractionRef,
    }
    local.set(
      layoutableRefKey({ kind: 'ElementPresentation', id: value.id }),
      entry
    )
  })
  localMaps.set(layoutableRefKey(scope), local)
}

function indexInteraction(
  map: Map<string, IndexedLayoutable>,
  localMaps: Map<string, Map<string, IndexedLayoutable>>,
  realization: InteractionRealization
): void {
  const ownerInteractionRef = realization.interactionRef
  realization.instructionRealizations.forEach((value) =>
    put(map, { kind: 'InstructionRealization', value, ownerInteractionRef })
  )
  switch (realization.type) {
    case 'SelectingRealization':
      if (realization.standaloneSelection) {
        put(map, {
          kind: 'SelectionPresentation',
          value: realization.standaloneSelection,
          ownerInteractionRef,
          purpose: { kind: 'StandaloneSelecting' },
        })
        indexElements(
          localMaps,
          {
            kind: 'SelectionPresentation',
            id: realization.standaloneSelection.id,
          },
          ownerInteractionRef,
          realization.standaloneSelection.optionPresentations
        )
      }
      realization.workspaceRealizations.forEach((workspace) => {
        if (workspace.referencedResponseSite)
          put(map, {
            kind: 'ResponseSiteRealization',
            value: workspace.referencedResponseSite,
            ownerInteractionRef,
            purpose: {
              kind: 'SelectingReferenced',
              stimulusRealizationRef: workspace.stimulusRealizationRef,
            },
          })
      })
      break
    case 'OrderingRealization':
      put(map, {
        kind: 'OrderingPresentation',
        value: realization.presentation,
        ownerInteractionRef,
      })
      indexElements(
        localMaps,
        { kind: 'OrderingPresentation', id: realization.presentation.id },
        ownerInteractionRef,
        realization.presentation.itemPresentations
      )
      break
    case 'RelatingRealization':
      for (const [set, presentation] of [
        ['Source', realization.sourceSetPresentation],
        ['Target', realization.targetSetPresentation],
      ] as const) {
        put(map, {
          kind: 'RelatingSetPresentation',
          value: presentation,
          ownerInteractionRef,
          set,
        })
        indexElements(
          localMaps,
          { kind: 'RelatingSetPresentation', id: presentation.id },
          ownerInteractionRef,
          presentation.elementPresentations
        )
      }
      if (realization.notationResponseSite)
        put(map, {
          kind: 'ResponseSiteRealization',
          value: realization.notationResponseSite,
          ownerInteractionRef,
          purpose: { kind: 'RelatingNotation' },
        })
      break
    case 'CompletingRealization':
      realization.gapRealizations.forEach((gap) => {
        if (gap.type === 'InputGapRealization')
          put(map, {
            kind: 'ResponseSiteRealization',
            value: gap.responseSite,
            ownerInteractionRef,
            purpose: { kind: 'CompletingInput', gapRef: gap.gapRef },
          })
        if (gap.type === 'ItemGapRealization' && gap.selectionPresentation) {
          put(map, {
            kind: 'SelectionPresentation',
            value: gap.selectionPresentation,
            ownerInteractionRef,
            purpose: {
              kind: 'CompletingItemSelection',
              gapRef: gap.gapRef,
            },
          })
          indexElements(
            localMaps,
            {
              kind: 'SelectionPresentation',
              id: gap.selectionPresentation.id,
            },
            ownerInteractionRef,
            gap.selectionPresentation.optionPresentations
          )
        }
        if (gap.type === 'ItemGapRealization' && gap.referencedPlacementSite)
          put(map, {
            kind: 'ResponseSiteRealization',
            value: gap.referencedPlacementSite,
            ownerInteractionRef,
            purpose: { kind: 'CompletingPlacement', gapRef: gap.gapRef },
          })
      })
      if (realization.itemSource) {
        put(map, {
          kind: 'CompletingItemSourceRealization',
          value: realization.itemSource,
          ownerInteractionRef,
        })
        indexElements(
          localMaps,
          {
            kind: 'CompletingItemSourceRealization',
            id: realization.itemSource.id,
          },
          ownerInteractionRef,
          realization.itemSource.itemPresentations
        )
      }
      break
    case 'ShortInputRealization':
    case 'EssayRealization':
      put(map, {
        kind: 'ResponseSiteRealization',
        value: realization.responseSite,
        ownerInteractionRef,
        purpose:
          realization.type === 'ShortInputRealization'
            ? { kind: 'ShortInput' }
            : { kind: 'Essay' },
      })
      break
    case 'ArtifactSubmissionRealization':
      put(map, {
        kind: 'ResponseSiteRealization',
        value: realization.submissionSite,
        ownerInteractionRef,
        purpose: { kind: 'ArtifactSubmission' },
      })
      break
    case 'MarkingRealization':
      break
  }
}

export function buildRenderContext(
  qd: QuestionDefinition,
  qfd: QuestionFormDefinition
): RenderContext {
  const layoutables = new Map<string, IndexedLayoutable>()
  const localElementPresentations = new Map<
    string,
    Map<string, IndexedLayoutable>
  >()
  qfd.stimulusRealizations.forEach((value) =>
    put(layoutables, { kind: 'StimulusRealization', value })
  )
  qfd.interactionRealizations.forEach((realization) =>
    indexInteraction(layoutables, localElementPresentations, realization)
  )
  const gaps = new Map<string, { interactionRef: string; gap: CompletingGap }>()
  qd.responseInteractions.forEach((interaction) => {
    if (interaction.type === 'Completing')
      interaction.completingGaps.forEach((gap) =>
        gaps.set(gap.id, { interactionRef: interaction.id, gap })
      )
  })
  return {
    qd,
    qfd,
    interactions: new Map(
      qd.responseInteractions.map((interaction) => [
        interaction.id,
        interaction,
      ])
    ),
    interactionRealizations: new Map(
      qfd.interactionRealizations.map((realization) => [
        realization.interactionRef,
        realization,
      ])
    ),
    stimuli: new Map(qd.stimuli.map((stimulus) => [stimulus.id, stimulus])),
    stimulusRealizations: new Map(
      qfd.stimulusRealizations.map((realization) => [
        realization.id,
        realization,
      ])
    ),
    layoutables,
    localElementPresentations,
    gaps,
  }
}

export function contentRepresentation(
  content: Content | undefined
): string | undefined {
  if (typeof content === 'string') return content
  return content?.representation
}

function directlyUsablePreservedContent(
  stimulus: Stimulus,
  realization: StimulusRealization
): string | undefined {
  if (!stimulus.allowedModalities.includes(realization.realizedModality))
    return undefined
  const representation = contentRepresentation(stimulus.sourceContent)
  if (!representation) return undefined
  if (realization.realizedModality === 'Text') return representation
  return /^(?:data:|blob:|https?:\/|\/|\.\.\/|\.\/)/u.test(representation)
    ? representation
    : undefined
}

/** Executes concrete QFD content. Adaptation/materialization never falls back to QD source content. */
export function resolveRealizedStimulusContent(
  stimulus: Stimulus,
  realization: StimulusRealization
): string | undefined {
  if (realization.mode !== 'PreserveContent')
    return contentRepresentation(realization.realizedContent)
  if (realization.realizedContent)
    return contentRepresentation(realization.realizedContent)
  return directlyUsablePreservedContent(stimulus, realization)
}

export function stimulusRealizationsFor(
  ctx: RenderContext,
  stimulusRef: string
): readonly StimulusRealization[] {
  return ctx.qfd.stimulusRealizations.filter(
    (realization) => realization.stimulusRef === stimulusRef
  )
}

export function exactStimulusRealization(
  ctx: RenderContext,
  realizationRef: string
): StimulusRealization | undefined {
  return ctx.stimulusRealizations.get(realizationRef)
}

export function indexedLayoutable(
  ctx: RenderContext,
  ref: LayoutableRealizationRef,
  localScope?: LayoutableRealizationRef
): IndexedLayoutable | undefined {
  if (localScope)
    return ctx.localElementPresentations
      .get(layoutableRefKey(localScope))
      ?.get(layoutableRefKey(ref))
  return ctx.layoutables.get(layoutableRefKey(ref))
}

export type LocalPresentationScope =
  | { kind: 'SelectionPresentation'; value: SelectionPresentation }
  | { kind: 'OrderingPresentation'; value: OrderingPresentation }
  | { kind: 'RelatingSetPresentation'; value: RelatingSetPresentation }
  | {
      kind: 'CompletingItemSourceRealization'
      value: CompletingItemSourceRealization
    }

export function localPresentationRef(
  scope: LocalPresentationScope
): LayoutableRealizationRef {
  return { kind: scope.kind, id: scope.value.id }
}

export function orderedLocalElementPresentations(
  ctx: RenderContext,
  scope: LocalPresentationScope
): readonly ElementPresentation[] {
  const presentationRef = localPresentationRef(scope)
  const result: ElementPresentation[] = []
  const visit = (layout: import('@/domain/qfd/model').LayoutElement): void => {
    if (layout.kind === 'LayoutGroup') {
      layout.children.forEach(visit)
      return
    }
    const entry = indexedLayoutable(ctx, layout.realizationRef, presentationRef)
    if (entry?.kind === 'ElementPresentation') result.push(entry.value)
  }
  visit(scope.value.localLayout)
  return result
}

export function elementPresentationSemanticRef(
  presentation: ElementPresentation
): string {
  switch (presentation.elementRef.kind) {
    case 'Choice':
      return presentation.elementRef.choiceRef
    case 'OrderingItem':
      return presentation.elementRef.orderingItemRef
    case 'RelatingElement':
      return presentation.elementRef.relatingElementRef
    case 'CompletingItem':
      return presentation.elementRef.completingItemRef
  }
}

export function elementPresentationText(
  ctx: RenderContext,
  presentation: ElementPresentation
): string {
  if (presentation.realizedText !== undefined) return presentation.realizedText
  const interaction = ctx.interactions.get(
    presentation.elementRef.interactionRef
  )
  if (!interaction) return elementPresentationSemanticRef(presentation)
  switch (presentation.elementRef.kind) {
    case 'Choice': {
      const choiceRef = presentation.elementRef.choiceRef
      return interaction.type === 'Selecting'
        ? (interaction.choices.find(({ id }) => id === choiceRef)
            ?.semanticContent ?? choiceRef)
        : choiceRef
    }
    case 'OrderingItem': {
      const orderingItemRef = presentation.elementRef.orderingItemRef
      return interaction.type === 'Ordering'
        ? (interaction.orderingItems.find(({ id }) => id === orderingItemRef)
            ?.semanticContent ?? orderingItemRef)
        : orderingItemRef
    }
    case 'RelatingElement': {
      const relatingElementRef = presentation.elementRef.relatingElementRef
      if (interaction.type !== 'Relating') return relatingElementRef
      const set =
        presentation.elementRef.set === 'Source'
          ? interaction.sourceSet
          : interaction.targetSet
      return (
        set.relatingElements.find(({ id }) => id === relatingElementRef)
          ?.semanticContent ?? relatingElementRef
      )
    }
    case 'CompletingItem': {
      const completingItemRef = presentation.elementRef.completingItemRef
      return interaction.type === 'Completing'
        ? (interaction.completingItems.find(
            ({ id }) => id === completingItemRef
          )?.semanticContent ?? completingItemRef)
        : completingItemRef
    }
  }
}

export function layoutableOwnerInteractionRef(
  ctx: RenderContext,
  ref: LayoutableRealizationRef
): string | undefined {
  const entry = indexedLayoutable(ctx, ref)
  return entry && entry.kind !== 'StimulusRealization'
    ? entry.ownerInteractionRef
    : undefined
}

/** Shared SRs remain visible whenever at least one served interaction is exposed. */
export function isLayoutableExposed(
  ctx: RenderContext,
  ref: LayoutableRealizationRef,
  isInteractionExposed: (interactionRef: string) => boolean
): boolean {
  const entry = indexedLayoutable(ctx, ref)
  if (!entry) return false
  if (entry.kind === 'StimulusRealization')
    return entry.value.servedInteractionRefs.some(isInteractionExposed)
  return isInteractionExposed(entry.ownerInteractionRef)
}

export interface AnchoredAffordance {
  interactionRef: string
  stimulusRealizationRef: string
  kind: 'Choice' | 'Gap' | 'Marking'
  elementRef?: string
  anchorKind?: 'TextRealizationAnchor' | 'RegionRealizationAnchor'
  payload?: unknown
}

/** Affordances retain interaction ownership even when their workspace SR is shared. */
export function anchoredAffordances(
  ctx: RenderContext,
  stimulusRealizationRef: string
): readonly AnchoredAffordance[] {
  const result: AnchoredAffordance[] = []
  ctx.qfd.interactionRealizations.forEach((realization) => {
    if (realization.type === 'SelectingRealization') {
      realization.workspaceRealizations
        .filter(
          (workspace) =>
            workspace.stimulusRealizationRef === stimulusRealizationRef
        )
        .forEach((workspace) =>
          workspace.choiceRealizations.forEach((choice) =>
            result.push({
              interactionRef: realization.interactionRef,
              stimulusRealizationRef,
              kind: 'Choice',
              elementRef: choice.choiceRef,
              anchorKind: choice.realizationAnchor?.kind,
              payload: choice.realizationAnchor?.payload,
            })
          )
        )
    } else if (realization.type === 'CompletingRealization') {
      realization.gapRealizations
        .filter((gap) => gap.stimulusRealizationRef === stimulusRealizationRef)
        .forEach((gap) =>
          result.push({
            interactionRef: realization.interactionRef,
            stimulusRealizationRef,
            kind: 'Gap',
            elementRef: gap.gapRef,
            anchorKind: gap.realizationAnchor?.kind,
            payload: gap.realizationAnchor?.payload,
          })
        )
    } else if (
      realization.type === 'MarkingRealization' &&
      realization.workspaceRealizationRef === stimulusRealizationRef
    ) {
      result.push({
        interactionRef: realization.interactionRef,
        stimulusRealizationRef,
        kind: 'Marking',
      })
    }
  })
  return result
}

/** Reference-implementation interpretation only; QFD anchor payload stays opaque. */
export function textAnchorMarker(payload: unknown): string | undefined {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'marker' in payload &&
    typeof payload.marker === 'string'
  )
    return payload.marker
  return undefined
}

export function splitByMarkers(
  text: string,
  markers: ReadonlyMap<string, ReactNode>
): ReactNode[] {
  if (markers.size === 0) return [text]
  const escaped = [...markers.keys()].map((marker) =>
    marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'g'))
  return parts.map((part) => (markers.has(part) ? markers.get(part) : part))
}

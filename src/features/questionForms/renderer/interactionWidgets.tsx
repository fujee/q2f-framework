import { useState } from 'react'
import type { ResponseInteraction } from '@/domain/qd/model'
import type {
  InteractionRealization,
  StimulusRealization,
} from '@/domain/qfd/model'
import { useRuntimeProgress } from './runtimeProgress'
import {
  resolveRealizedStimulusContent,
  type RenderContext,
} from './renderContext'

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
  return realization.realizedModality === 'Image' ? (
    <img
      src={content}
      alt=""
      className="max-h-full max-w-full object-contain"
    />
  ) : (
    <div className="whitespace-pre-wrap">{content}</div>
  )
}

function SelectingWidget({
  interaction,
  realization,
  disabled,
}: {
  interaction: Extract<ResponseInteraction, { type: 'Selecting' }>
  realization: Extract<InteractionRealization, { type: 'SelectingRealization' }>
  disabled: boolean
}) {
  const { setResponse } = useRuntimeProgress()
  const [selected, setSelected] = useState<string[]>([])
  const technique =
    realization.standaloneSelection?.mode ??
    (realization.workspaceRealizations.some(
      ({ mode }) => mode === 'ReferencedSelection'
    )
      ? 'ReferencedSelection'
      : 'DirectSelection')
  return (
    <fieldset disabled={disabled} data-technique={technique}>
      {interaction.choices.map((choice) => {
        const checked = selected.includes(choice.id)
        return (
          <label key={choice.id} className="qfd-option">
            <input
              type={interaction.maxSelections === 1 ? 'radio' : 'checkbox'}
              checked={checked}
              onChange={() => {
                const next =
                  interaction.maxSelections === 1
                    ? [choice.id]
                    : checked
                      ? selected.filter((id) => id !== choice.id)
                      : [...selected, choice.id]
                setSelected(next)
                setResponse(interaction.id, next)
              }}
            />
            {choice.semanticContent}
          </label>
        )
      })}
    </fieldset>
  )
}

function OrderingWidget({
  interaction,
  realization,
  disabled,
}: {
  interaction: Extract<ResponseInteraction, { type: 'Ordering' }>
  realization: Extract<InteractionRealization, { type: 'OrderingRealization' }>
  disabled: boolean
}) {
  const { setResponse } = useRuntimeProgress()
  const [order, setOrder] = useState(
    interaction.orderingItems.map(({ id }) => id)
  )
  const move = (index: number, offset: number) => {
    const target = index + offset
    if (disabled || target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
    setResponse(interaction.id, next)
  }
  return (
    <ol data-technique={realization.mode}>
      {order.map((id, index) => (
        <li key={id} className="qfd-element">
          {
            interaction.orderingItems.find((item) => item.id === id)
              ?.semanticContent
          }
          <button
            type="button"
            disabled={disabled || index === 0}
            onClick={() => move(index, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={disabled || index === order.length - 1}
            onClick={() => move(index, 1)}
          >
            ↓
          </button>
        </li>
      ))}
    </ol>
  )
}

function RelatingWidget({
  interaction,
  realization,
  disabled,
}: {
  interaction: Extract<ResponseInteraction, { type: 'Relating' }>
  realization: Extract<InteractionRealization, { type: 'RelatingRealization' }>
  disabled: boolean
}) {
  const { setResponse } = useRuntimeProgress()
  const [targets, setTargets] = useState<Record<string, string>>({})
  return (
    <div data-technique={realization.mode}>
      {interaction.sourceSet.relatingElements.map((source) => (
        <label key={source.id} className="qfd-element">
          {source.semanticContent}
          <select
            disabled={disabled}
            value={targets[source.id] ?? ''}
            onChange={(event) => {
              const next = { ...targets, [source.id]: event.target.value }
              setTargets(next)
              setResponse(
                interaction.id,
                Object.entries(next)
                  .filter(([, target]) => target.length > 0)
                  .map(([sourceElementRef, targetElementRef]) => ({
                    sourceElementRef,
                    targetElementRef,
                  }))
              )
            }}
          >
            <option value="">Choose…</option>
            {interaction.targetSet.relatingElements.map((target) => (
              <option key={target.id} value={target.id}>
                {target.semanticContent}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}

function CompletingWidget({
  interaction,
  realization,
  disabled,
}: {
  interaction: Extract<ResponseInteraction, { type: 'Completing' }>
  realization: Extract<
    InteractionRealization,
    { type: 'CompletingRealization' }
  >
  disabled: boolean
}) {
  const { setResponse } = useRuntimeProgress()
  const [responses, setResponses] = useState<Record<string, string>>({})
  const update = (gapRef: string, value: string) => {
    const next = { ...responses, [gapRef]: value }
    setResponses(next)
    setResponse(interaction.id, next)
  }
  return (
    <div
      data-technique={realization.gapRealizations
        .map((gap) =>
          gap.type === 'InputGapRealization'
            ? gap.responsePlacement
            : gap.assignmentMode
        )
        .join(',')}
    >
      {interaction.completingGaps.map((gap) => (
        <label key={gap.id} className="qfd-element">
          {gap.id}
          {gap.type === 'InputGap' ? (
            <input
              disabled={disabled}
              value={responses[gap.id] ?? ''}
              onChange={(event) => update(gap.id, event.target.value)}
            />
          ) : (
            <select
              disabled={disabled}
              value={responses[gap.id] ?? ''}
              onChange={(event) => update(gap.id, event.target.value)}
            >
              <option value="">Choose…</option>
              {interaction.completingItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.semanticContent}
                </option>
              ))}
            </select>
          )}
        </label>
      ))}
    </div>
  )
}

function ScalarWidget({
  interaction,
  disabled,
}: {
  interaction: Extract<ResponseInteraction, { type: 'ShortInput' | 'Essay' }>
  disabled: boolean
}) {
  const { setResponse } = useRuntimeProgress()
  if (interaction.type === 'Essay')
    return (
      <textarea
        disabled={disabled}
        aria-label="Essay response"
        onChange={(event) => setResponse(interaction.id, event.target.value)}
      />
    )
  return (
    <input
      disabled={disabled}
      aria-label="Short response"
      onChange={(event) => setResponse(interaction.id, event.target.value)}
    />
  )
}

function ArtifactWidget({
  interaction,
  realization,
  disabled,
}: {
  interaction: Extract<ResponseInteraction, { type: 'ArtifactSubmission' }>
  realization: Extract<
    InteractionRealization,
    { type: 'ArtifactSubmissionRealization' }
  >
  disabled: boolean
}) {
  const { setResponse } = useRuntimeProgress()
  if (realization.submissionMode === 'PhysicalSubmission')
    return <div>Physical submission required</div>
  return (
    <input
      disabled={disabled}
      type="file"
      aria-label="Artifact submission"
      multiple
      onChange={(event) =>
        setResponse(
          interaction.id,
          [...(event.target.files ?? [])].map((file) => file.name)
        )
      }
    />
  )
}

function MarkingWidget({
  interaction,
  disabled,
}: {
  interaction: Extract<ResponseInteraction, { type: 'Marking' }>
  disabled: boolean
}) {
  const { setResponse } = useRuntimeProgress()
  const [marks, setMarks] = useState<Array<{ rendererToken: string }>>([])
  return (
    <button
      type="button"
      disabled={disabled}
      data-renderer-specific-marking="true"
      onClick={() => {
        const next = [
          ...marks,
          { rendererToken: `${interaction.id}-mark-${marks.length + 1}` },
        ]
        setMarks(next)
        setResponse(interaction.id, next)
      }}
    >
      Add {interaction.markType} mark ({marks.length})
    </button>
  )
}

/** Renders the current typed interaction family; no generic mechanism registry exists. */
export function InteractionWidget({
  interaction,
  realization,
  disabled,
}: {
  interaction: ResponseInteraction
  realization: InteractionRealization
  disabled: boolean
}) {
  if (interaction.id !== realization.interactionRef) return null
  switch (interaction.type) {
    case 'Selecting':
      return realization.type === 'SelectingRealization' ? (
        <SelectingWidget
          interaction={interaction}
          realization={realization}
          disabled={disabled}
        />
      ) : null
    case 'Ordering':
      return realization.type === 'OrderingRealization' ? (
        <OrderingWidget
          interaction={interaction}
          realization={realization}
          disabled={disabled}
        />
      ) : null
    case 'Relating':
      return realization.type === 'RelatingRealization' ? (
        <RelatingWidget
          interaction={interaction}
          realization={realization}
          disabled={disabled}
        />
      ) : null
    case 'Completing':
      return realization.type === 'CompletingRealization' ? (
        <CompletingWidget
          interaction={interaction}
          realization={realization}
          disabled={disabled}
        />
      ) : null
    case 'ShortInput':
      return realization.type === 'ShortInputRealization' ? (
        <ScalarWidget interaction={interaction} disabled={disabled} />
      ) : null
    case 'Essay':
      return realization.type === 'EssayRealization' ? (
        <ScalarWidget interaction={interaction} disabled={disabled} />
      ) : null
    case 'ArtifactSubmission':
      return realization.type === 'ArtifactSubmissionRealization' ? (
        <ArtifactWidget
          interaction={interaction}
          realization={realization}
          disabled={disabled}
        />
      ) : null
    case 'Marking':
      return realization.type === 'MarkingRealization' ? (
        <MarkingWidget interaction={interaction} disabled={disabled} />
      ) : null
  }
}

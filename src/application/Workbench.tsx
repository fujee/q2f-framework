import { useMemo, useState } from 'react'
import type { QuestionDefinition } from '@/domain/qd/model'
import type { QuestionFormDefinition } from '@/domain/qfd/model'
import type { QuestionFormProfile } from '@/domain/qfd/profiles/model'
import { validateQD } from '@/domain/qd/validation/validateQD'
import { generateQfdSkeleton } from '@/domain/qfd/transformation/generateQfdSkeleton'
import {
  CONVENTIONAL_PAPER_PROFILE,
  INTERACTIVE_WEB_PROFILE,
} from '@/domain/qfd/profiles/registry'
import { observedOutcome } from '@/domain/evaluation/pipeline'
import { QfdPreview } from '@/features/questionForms/renderer/RenderPreview'
import { REVIEWER_EXAMPLES } from './examples'
import { WorkbenchRepository } from './repository'
import { reviewerRenderableCase } from './reviewerAssets'
import {
  createOrderingQfd,
  createOrderingQuestion,
  evaluateStoredPair,
  Q2_WALKTHROUGH,
} from './workflow'

const repository = new WorkbenchRepository(window.localStorage)
const profiles = [INTERACTIVE_WEB_PROFILE, CONVENTIONAL_PAPER_PROFILE]
const pretty = (value: unknown) => JSON.stringify(value, null, 2)
const now = () => new Date().toISOString()

function profileById(id: string): QuestionFormProfile {
  const profile = profiles.find((candidate) => candidate.id === id)
  if (!profile) throw new Error(`Unknown profile '${id}'.`)
  return profile
}

function parseModel<T>(text: string, kind: string): T {
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null)
    throw new Error(`${kind} JSON must contain an object.`)
  return parsed as T
}

function Findings({ value }: { value: ReturnType<typeof validateQD> | null }) {
  if (!value) return <p className="muted">Not run.</p>
  return (
    <div>
      <strong className={`status status-${value.aggregate.toLowerCase()}`}>
        {value.aggregate}
      </strong>
      <ul className="findings">
        {value.findings.map((finding, index) => (
          <li key={`${finding.ruleId}-${index}`}>
            <code>{finding.ruleId}</code> · {finding.status} — {finding.message}
            {finding.path ? <small>Location: {finding.path}</small> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Workbench() {
  const [state, setState] = useState(() => repository.load())
  const initialQd = useMemo(
    () =>
      createOrderingQuestion({
        ...Q2_WALKTHROUGH,
        items: [...Q2_WALKTHROUGH.items],
        correctOrder: [...Q2_WALKTHROUGH.correctOrder],
      }),
    []
  )
  const [qdText, setQdText] = useState(pretty(initialQd))
  const [qfdText, setQfdText] = useState('')
  const [label, setLabel] = useState('Q2 Ordering walkthrough')
  const [questionRecordId, setQuestionRecordId] = useState('question-q2')
  const [qfdRecordId, setQfdRecordId] = useState('qfd-q2-web')
  const [profileId, setProfileId] = useState(INTERACTIVE_WEB_PROFILE.id)
  const [mode, setMode] = useState<'DirectOrdering' | 'OrderNotation'>(
    'DirectOrdering'
  )
  const [message, setMessage] = useState('Ready.')
  const [qdResult, setQdResult] = useState<ReturnType<
    typeof validateQD
  > | null>(null)
  const [evaluation, setEvaluation] = useState<ReturnType<
    typeof evaluateStoredPair
  > | null>(null)
  const [previewPair, setPreviewPair] = useState<{
    qd: QuestionDefinition
    qfd: QuestionFormDefinition
  } | null>(null)

  const act = (operation: () => void) => {
    try {
      operation()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }
  const currentQd = () => parseModel<QuestionDefinition>(qdText, 'QD')
  const currentQfd = () => parseModel<QuestionFormDefinition>(qfdText, 'QFD')

  const saveQd = () =>
    act(() => {
      const qd = currentQd()
      const validation = validateQD(qd)
      setQdResult(validation)
      const existing = state.questions.find(
        ({ recordId }) => recordId === questionRecordId
      )
      const timestamp = now()
      setState(
        repository.saveQuestion({
          recordId: questionRecordId,
          authoringLabel: label,
          qd,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        })
      )
      setMessage(`Saved QD record '${questionRecordId}' without translation.`)
    })

  const plan = () =>
    act(() => {
      const skeleton = generateQfdSkeleton(currentQd(), profileById(profileId))
      setMessage(
        `Planning produced ${skeleton.obligations.length} explicit obligation(s):\n${pretty(skeleton)}`
      )
    })

  const createGuidedQfd = () =>
    act(() => {
      const qfd = createOrderingQfd(currentQd(), profileById(profileId), mode)
      setQfdText(pretty(qfd))
      setEvaluation(null)
      setMessage(
        'Created a complete Ordering QFD from the explicitly selected mode.'
      )
    })

  const saveQfd = () =>
    act(() => {
      const qfd = currentQfd()
      const timestamp = now()
      const existing = state.questionForms.find(
        ({ recordId }) => recordId === qfdRecordId
      )
      setState(
        repository.saveQuestionForm({
          recordId: qfdRecordId,
          authoringLabel: `${label} / ${qfd.targetProfileRef}`,
          questionRecordId,
          qfd,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        })
      )
      setMessage(
        `Saved QFD record '${qfdRecordId}' without a scientific QFD id.`
      )
    })

  const runPipeline = () =>
    act(() => {
      const qd = currentQd()
      const qfd = currentQfd()
      const result = evaluateStoredPair(
        `workbench-${qfdRecordId}`,
        qd,
        qfd,
        profileById(qfd.targetProfileRef)
      )
      setEvaluation(result)
      setMessage('Executed the stabilized Evaluation Protocol v2 pipeline.')
    })

  return (
    <main className="workbench">
      <header className="hero-header">
        <p className="eyebrow">
          Q2F reference implementation · Evaluation Protocol v2
        </p>
        <h1>Scientific authoring and realization workbench</h1>
        <p>
          Author QD semantics, resolve a concrete QFD for a capability profile,
          inspect Validation / Feasibility / Conformance, then use the reviewed
          candidate renderer.
        </p>
      </header>

      <nav className="boundary-strip" aria-label="Scientific boundaries">
        <span>QD semantics</span>
        <b>→</b>
        <span>QFP capability contract</span>
        <b>→</b>
        <span>explicit QFD decisions</span>
        <b>→</b>
        <span>V / F / C</span>
        <b>→</b>
        <span>preview</span>
      </nav>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="step">01</span>
            <h2>QuestionDefinition authoring</h2>
          </div>
          <p>
            Advanced JSON exposes the complete stabilized QD model; the starter
            is the guided Q2 walkthrough.
          </p>
        </div>
        <div className="form-row">
          <label>
            Application record id
            <input
              value={questionRecordId}
              onChange={(event) => setQuestionRecordId(event.target.value)}
            />
          </label>
          <label>
            Authoring label
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
        </div>
        <textarea
          aria-label="QuestionDefinition JSON"
          className="model-editor"
          value={qdText}
          onChange={(event) => setQdText(event.target.value)}
        />
        <div className="actions">
          <button
            onClick={() =>
              act(() => {
                const result = validateQD(currentQd())
                setQdResult(result)
                setMessage('Ran the authoritative QD validator.')
              })
            }
          >
            Validate QD
          </button>
          <button onClick={saveQd}>Save QD</button>
          <button
            className="secondary"
            onClick={() =>
              act(() => {
                const record = state.questions.find(
                  ({ recordId }) => recordId === questionRecordId
                )
                if (!record) throw new Error('No saved QD with this record id.')
                setQdText(pretty(record.qd))
                setLabel(record.authoringLabel)
                setMessage('Reopened the exact stored scientific QD.')
              })
            }
          >
            Reopen saved QD
          </button>
        </div>
        <Findings value={qdResult} />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="step">02</span>
            <h2>Profile and realization planning</h2>
          </div>
          <p>The skeleton is a planning aid, never a partial scientific QFD.</p>
        </div>
        <div className="form-row">
          <label>
            Target profile
            <select
              value={profileId}
              onChange={(event) => {
                const next = event.target.value
                setProfileId(next)
                setMode(
                  next === INTERACTIVE_WEB_PROFILE.id
                    ? 'DirectOrdering'
                    : 'OrderNotation'
                )
              }}
            >
              {profiles.map((profile) => (
                <option key={profile.id}>{profile.id}</option>
              ))}
            </select>
          </label>
          <label>
            Explicit Ordering decision
            <select
              value={mode}
              onChange={(event) =>
                setMode(
                  event.target.value as 'DirectOrdering' | 'OrderNotation'
                )
              }
            >
              <option>DirectOrdering</option>
              <option>OrderNotation</option>
            </select>
          </label>
        </div>
        <div className="actions">
          <button onClick={plan}>Inspect QfdSkeleton obligations</button>
          <button onClick={createGuidedQfd}>Resolve guided Ordering QFD</button>
        </div>
        <details>
          <summary>Capability contract</summary>
          <pre>{pretty(profileById(profileId))}</pre>
        </details>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="step">03</span>
            <h2>Complete QuestionFormDefinition</h2>
          </div>
          <p>
            Use the guided builder or edit every stabilized QFD field directly.
            No legacy mechanism translation is involved.
          </p>
        </div>
        <label>
          Application QFD record id
          <input
            value={qfdRecordId}
            onChange={(event) => setQfdRecordId(event.target.value)}
          />
        </label>
        <textarea
          aria-label="QuestionFormDefinition JSON"
          className="model-editor"
          value={qfdText}
          onChange={(event) => setQfdText(event.target.value)}
          placeholder="Create the guided QFD or paste a complete stabilized QFD."
        />
        <div className="actions">
          <button onClick={saveQfd}>Save QFD</button>
          <button
            className="secondary"
            onClick={() =>
              act(() => {
                const record = state.questionForms.find(
                  ({ recordId }) => recordId === qfdRecordId
                )
                if (!record)
                  throw new Error('No saved QFD with this record id.')
                const question = state.questions.find(
                  ({ recordId }) => recordId === record.questionRecordId
                )
                if (!question)
                  throw new Error('The QFD owner QD record is missing.')
                setQfdText(pretty(record.qfd))
                setQdText(pretty(question.qd))
                setQuestionRecordId(question.recordId)
                setMessage('Reopened stored QD and QFD without translation.')
              })
            }
          >
            Reopen saved QFD
          </button>
        </div>
        <p className="muted">
          Stored forms for this QD:{' '}
          {state.questionForms
            .filter((record) => record.questionRecordId === questionRecordId)
            .map(({ recordId }) => recordId)
            .join(', ') || 'none'}
        </p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="step">04</span>
            <h2>Validation / Feasibility / Conformance</h2>
          </div>
          <p>Feasibility and semantic conformance are independent results.</p>
        </div>
        <div className="actions">
          <button onClick={runPipeline}>Run stabilized pipeline</button>
          <button
            onClick={() =>
              act(() => {
                setPreviewPair({ qd: currentQd(), qfd: currentQfd() })
                setMessage('Opened the actual PR6 candidate renderer.')
              })
            }
          >
            Open candidate preview
          </button>
        </div>
        {evaluation ? (
          <div className="stage-grid">
            {Object.entries(observedOutcome(evaluation)).map(
              ([stage, status]) => {
                const result = evaluation[stage as keyof typeof evaluation]
                const findings =
                  result && typeof result === 'object' && 'findings' in result
                    ? (
                        result as {
                          findings: Array<{
                            ruleId: string
                            status: string
                            message: string
                          }>
                        }
                      ).findings
                    : []
                return (
                  <article key={stage}>
                    <small>{stage}</small>
                    <strong>{status}</strong>
                    <ul>
                      {findings.map((finding, index) => (
                        <li key={`${finding.ruleId}-${index}`}>
                          {finding.status}: {finding.message}
                        </li>
                      ))}
                    </ul>
                  </article>
                )
              }
            )}
          </div>
        ) : (
          <p className="muted">
            Later stages display NOT_EVALUATED when a prerequisite validation
            fails.
          </p>
        )}
        {previewPair ? (
          <div className="preview">
            <h3>Candidate-facing preview</h3>
            <QfdPreview {...previewPair} />
          </div>
        ) : null}
      </section>

      <section className="panel examples">
        <div className="section-heading">
          <div>
            <span className="step">05</span>
            <h2>Frozen reviewer examples</h2>
          </div>
          <p>
            These open the exact Evaluation Protocol v2 fixtures—no divergent
            demo copies.
          </p>
        </div>
        <div className="example-grid">
          {REVIEWER_EXAMPLES.map((example) => (
            <article key={example.scenarioId}>
              <h3>{example.scenarioId}</h3>
              <p>{example.summary}</p>
              {example.cases.map((testCase) => (
                <button
                  className="secondary"
                  key={testCase.id}
                  onClick={() => {
                    const renderable = reviewerRenderableCase(testCase)
                    setQdText(pretty(testCase.qd))
                    setQfdText(pretty(testCase.qfd))
                    setProfileId(testCase.profile.id)
                    setPreviewPair(renderable)
                    setEvaluation(
                      evaluateStoredPair(
                        testCase.id,
                        testCase.qd,
                        testCase.qfd,
                        testCase.profile
                      )
                    )
                    setMessage(
                      `Opened frozen case ${testCase.id} with its versioned reviewer asset.`
                    )
                  }}
                >
                  {testCase.profile.id.replace('Profile', '')}
                </button>
              ))}
            </article>
          ))}
        </div>
      </section>

      <aside className="activity">
        <strong>Workbench activity</strong>
        <pre>{message}</pre>
      </aside>
    </main>
  )
}

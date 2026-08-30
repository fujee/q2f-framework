import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ResponseInteraction } from '@/domain/qd/model'
import {
  FROZEN_BOUNDARY_CASES,
  FROZEN_PRIMARY_CASES,
  type FrozenEvaluationCase,
} from '@/domain/evaluation/frozenProtocolFixtures'
import {
  evaluateCase,
  observedOutcome,
  type EvaluationStageStatus,
} from '@/domain/evaluation/pipeline'
import {
  CanonicalResponseRejection,
  describeCanonicalNormalizationSupport,
  normalizeArtifactSubmissionResponse,
  normalizeCompletingResponse,
  normalizeEssayResponse,
  normalizeOrderingResponse,
  normalizeRelatingResponse,
  normalizeSelectingResponse,
  normalizeShortInputResponse,
} from '@/domain/evaluation/canonicalResponse'

const ROOT = process.cwd()
const OUTPUT = resolve(ROOT, 'evaluation-results/final-run')
const SPECIFICATION_COMMIT = 'ad6cccc765f99a84b9681cb8e8013b6b3ee5248f'
const allCases = [...FROZEN_PRIMARY_CASES, ...FROZEN_BOUNDARY_CASES]

function stableValue(value: unknown): unknown {
  if (value instanceof Set)
    return [...value]
      .map(stableValue)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  if (value instanceof Map)
    return [...value.entries()].map(([key, entry]) => [key, stableValue(entry)])
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)])
    )
  return value
}

function json(value: unknown) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`
}

function sha256File(path: string) {
  return createHash('sha256')
    .update(readFileSync(resolve(ROOT, path)))
    .digest('hex')
}

function git(...args: string[]) {
  return execFileSync(
    'git',
    ['-c', `safe.directory=${ROOT.replaceAll('\\', '/')}`, ...args],
    { cwd: ROOT, encoding: 'utf8' }
  ).trim()
}

function npmVersion() {
  const match = process.env.npm_config_user_agent?.match(/npm\/([^\s]+)/u)
  return match?.[1] ?? 'unavailable'
}

function referenceCommit() {
  if (process.env.REFERENCE_IMPLEMENTATION_COMMIT)
    return process.env.REFERENCE_IMPLEMENTATION_COMMIT
  const prior = resolve(OUTPUT, 'manifest.json')
  if (existsSync(prior)) {
    const parsed = JSON.parse(readFileSync(prior, 'utf8')) as {
      referenceImplementationCommit?: string
    }
    if (parsed.referenceImplementationCommit)
      return parsed.referenceImplementationCommit
  }
  return git('rev-parse', 'HEAD')
}

const ASSETS = [
  {
    logicalAssetId: 'Q5_THREE_TONE_AUDIO',
    scenarioId: 'Q5',
    repositoryPath: 'src/evaluation-assets/q5-three-tone.wav.base64',
    role: 'Context Audio',
    requirement: 'Exactly three clearly separated tones.',
  },
  {
    logicalAssetId: 'Q6_ONE_MOVING_BALL',
    scenarioId: 'Q6',
    repositoryPath: 'public/evaluation-assets/q6-one-moving-ball.svg',
    role: 'Context temporal visual (renderer-local animated SVG carrier)',
    requirement: 'Exactly one ball moves continuously from left to right.',
  },
  {
    logicalAssetId: 'Q9_THREE_SHAPES',
    scenarioId: 'Q9',
    repositoryPath: 'public/evaluation-assets/q9-shapes.svg',
    role: 'Workspace Image',
    requirement: 'One triangle, one circle, and one square.',
  },
  {
    logicalAssetId: 'Q10_FOUR_CHAMBER_HEART',
    scenarioId: 'Q10',
    repositoryPath: 'public/evaluation-assets/q10-heart.svg',
    role: 'Workspace materialized Image',
    requirement: 'Unlabelled schematic heart with four distinct chambers.',
  },
  {
    logicalAssetId: 'Q11_YEAR_VALUE_BARS',
    scenarioId: 'Q11',
    repositoryPath: 'public/evaluation-assets/q11-bars.svg',
    role: 'Context adapted Image',
    requirement: '2019→40, 2020→60, 2021→50 with scale and axes.',
  },
] as const

function fixtureInteraction<T extends ResponseInteraction['type']>(
  caseId: string,
  type: T
): Extract<ResponseInteraction, { type: T }> {
  const candidate = FROZEN_PRIMARY_CASES.find(
    ({ id }) => id === caseId
  )?.qd.responseInteractions.find(
    (interaction): interaction is Extract<ResponseInteraction, { type: T }> =>
      interaction.type === type
  )
  if (!candidate) throw new Error(`Missing ${type} in ${caseId}.`)
  return candidate
}

function canonicalEvidence() {
  const evidence: Array<Record<string, unknown>> = []
  const accept = (
    family: string,
    technique: string,
    raw: unknown,
    operation: () => unknown,
    equivalentGroup?: string
  ) =>
    evidence.push({
      family,
      technique,
      raw,
      accepted: true,
      canonicalResponse: operation(),
      equivalentGroup,
    })
  const reject = (
    family: string,
    technique: string,
    raw: unknown,
    operation: () => unknown
  ) => {
    try {
      operation()
      evidence.push({
        family,
        technique,
        raw,
        accepted: true,
        error: 'Expected rejection did not occur.',
      })
    } catch (error) {
      if (!(error instanceof CanonicalResponseRejection)) throw error
      evidence.push({
        family,
        technique,
        raw,
        accepted: false,
        rejectionCode: error.code,
      })
    }
  }

  const q1 = fixtureInteraction('Q1-InteractiveWebProfile', 'Selecting')
  const selected = ['he', 'ne']
  accept(
    'Selecting',
    'Expanded',
    { selectedChoiceRefs: selected },
    () =>
      normalizeSelectingResponse(q1, {
        technique: 'Expanded',
        selectedChoiceRefs: selected,
      }),
    'Q1-choice-set'
  )
  accept(
    'Selecting',
    'Collapsed',
    { selectedChoiceRefs: [...selected].reverse() },
    () =>
      normalizeSelectingResponse(q1, {
        technique: 'Collapsed',
        selectedChoiceRefs: [...selected].reverse(),
      }),
    'Q1-choice-set'
  )
  reject(
    'Selecting',
    'Collapsed',
    { selectedChoiceRefs: ['he', 'unknown'] },
    () =>
      normalizeSelectingResponse(q1, {
        technique: 'Collapsed',
        selectedChoiceRefs: ['he', 'unknown'],
      })
  )
  reject('Selecting', 'Collapsed', { selectedChoiceRefs: ['he', 'he'] }, () =>
    normalizeSelectingResponse(q1, {
      technique: 'Collapsed',
      selectedChoiceRefs: ['he', 'he'],
    })
  )

  const q9 = fixtureInteraction('Q9-InteractiveWebProfile', 'Selecting')
  reject(
    'Selecting',
    'ReferencedSelection',
    {
      selectedRawRefs: ['B'],
      mappings: [
        { rawRef: 'B', semanticRef: 'circle' },
        { rawRef: 'B', semanticRef: 'triangle' },
      ],
    },
    () =>
      normalizeSelectingResponse(q9, {
        technique: 'ReferencedSelection',
        selectedRawRefs: ['B'],
        mappings: [
          { rawRef: 'B', semanticRef: 'circle' },
          { rawRef: 'B', semanticRef: 'triangle' },
        ],
      })
  )

  const q2 = fixtureInteraction('Q2-InteractiveWebProfile', 'Ordering')
  const order = ['prophase', 'metaphase', 'anaphase', 'telophase']
  accept(
    'Ordering',
    'DirectOrdering',
    { orderedItemRefs: order },
    () =>
      normalizeOrderingResponse(q2, {
        technique: 'DirectOrdering',
        orderedItemRefs: order,
      }),
    'Q2-order'
  )
  accept(
    'Ordering',
    'OrderNotation',
    {
      rankedItems: order.map((itemRef, index) => ({
        itemRef,
        rank: index + 1,
      })),
    },
    () =>
      normalizeOrderingResponse(q2, {
        technique: 'OrderNotation',
        rankedItems: order.map((itemRef, index) => ({
          itemRef,
          rank: index + 1,
        })),
      }),
    'Q2-order'
  )
  reject(
    'Ordering',
    'DirectOrdering',
    { orderedItemRefs: order.slice(0, 3) },
    () =>
      normalizeOrderingResponse(q2, {
        technique: 'DirectOrdering',
        orderedItemRefs: order.slice(0, 3),
      })
  )
  reject(
    'Ordering',
    'DirectOrdering',
    { orderedItemRefs: ['prophase', 'prophase', 'anaphase', 'telophase'] },
    () =>
      normalizeOrderingResponse(q2, {
        technique: 'DirectOrdering',
        orderedItemRefs: ['prophase', 'prophase', 'anaphase', 'telophase'],
      })
  )

  const q3 = fixtureInteraction('Q3-InteractiveWebProfile', 'Relating')
  const pairs = [
    { sourceElementRef: 'france', targetElementRef: 'paris' },
    { sourceElementRef: 'italy', targetElementRef: 'rome' },
    { sourceElementRef: 'spain', targetElementRef: 'madrid' },
  ]
  accept(
    'Relating',
    'DirectRelationConstruction',
    { pairs },
    () =>
      normalizeRelatingResponse(q3, {
        technique: 'DirectRelationConstruction',
        pairs,
      }),
    'Q3-relations'
  )
  accept(
    'Relating',
    'RelationNotation',
    { mapped: true },
    () =>
      normalizeRelatingResponse(q3, {
        technique: 'RelationNotation',
        pairs: [
          { sourceElementRef: 'F', targetElementRef: 'P' },
          { sourceElementRef: 'I', targetElementRef: 'R' },
          { sourceElementRef: 'S', targetElementRef: 'M' },
        ],
        sourceMappings: [
          { rawRef: 'F', semanticRef: 'france' },
          { rawRef: 'I', semanticRef: 'italy' },
          { rawRef: 'S', semanticRef: 'spain' },
        ],
        targetMappings: [
          { rawRef: 'P', semanticRef: 'paris' },
          { rawRef: 'R', semanticRef: 'rome' },
          { rawRef: 'M', semanticRef: 'madrid' },
        ],
      }),
    'Q3-relations'
  )
  reject(
    'Relating',
    'DirectRelationConstruction',
    { pairs: [{ sourceElementRef: 'paris', targetElementRef: 'france' }] },
    () =>
      normalizeRelatingResponse(q3, {
        technique: 'DirectRelationConstruction',
        pairs: [{ sourceElementRef: 'paris', targetElementRef: 'france' }],
      })
  )

  const q4 = fixtureInteraction('Q4-InteractiveWebProfile', 'Completing')
  const gaps = [
    { gapRef: 'gap-1', response: { kind: 'ItemRef' as const, itemRef: 'co2' } },
    { gapRef: 'gap-2', response: { kind: 'ItemRef' as const, itemRef: 'o2' } },
  ]
  accept(
    'Completing',
    'DirectPlacement',
    { responses: gaps },
    () =>
      normalizeCompletingResponse(q4, {
        technique: 'DirectPlacement',
        responses: gaps,
      }),
    'Q4-gap-map'
  )
  accept(
    'Completing',
    'ItemSelection',
    { responses: [...gaps].reverse() },
    () =>
      normalizeCompletingResponse(q4, {
        technique: 'ItemSelection',
        responses: [...gaps].reverse(),
      }),
    'Q4-gap-map'
  )
  reject('Completing', 'DirectPlacement', { gapRef: 'other-gap' }, () =>
    normalizeCompletingResponse(q4, {
      technique: 'DirectPlacement',
      responses: [
        { gapRef: 'other-gap', response: { kind: 'ItemRef', itemRef: 'co2' } },
        gaps[1],
      ],
    })
  )
  reject('Completing', 'ItemSelection', { scalarInItemGap: true }, () =>
    normalizeCompletingResponse(q4, {
      technique: 'ItemSelection',
      responses: [
        { gapRef: 'gap-1', response: { kind: 'Scalar', value: 'co2' } },
        gaps[1],
      ],
    })
  )
  reject('Completing', 'DirectPlacement', { repeatedItem: 'co2' }, () =>
    normalizeCompletingResponse(q4, {
      technique: 'DirectPlacement',
      responses: [
        gaps[0],
        { gapRef: 'gap-2', response: { kind: 'ItemRef', itemRef: 'co2' } },
      ],
    })
  )

  const q5 = fixtureInteraction('Q5-InteractiveWebProfile', 'ShortInput')
  accept('ShortInput', 'ScalarResponse', '3', () =>
    normalizeShortInputResponse(q5, '3')
  )
  reject('ShortInput', 'ScalarResponse', '3.0', () =>
    normalizeShortInputResponse(q5, '3.0')
  )
  const essay = fixtureInteraction('Q6-InteractiveWebProfile', 'Essay')
  const essayText =
    'The single ball moves steadily from the left side toward the right side before repeating the same clearly visible path.'
  accept('Essay', 'ExtendedTextResponse', essayText, () =>
    normalizeEssayResponse(essay, essayText)
  )
  const artifact = fixtureInteraction(
    'Q7-InteractiveWebProfile',
    'ArtifactSubmission'
  )
  accept(
    'ArtifactSubmission',
    'DigitalSubmission',
    { artifactRefs: ['concept-map'] },
    () =>
      normalizeArtifactSubmissionResponse(artifact, {
        channel: 'DigitalSubmission',
        artifactRefs: ['concept-map'],
      }),
    'Q7-artifact'
  )
  accept(
    'ArtifactSubmission',
    'PhysicalSubmission',
    { artifactRefs: ['concept-map'] },
    () =>
      normalizeArtifactSubmissionResponse(artifact, {
        channel: 'PhysicalSubmission',
        artifactRefs: ['concept-map'],
      }),
    'Q7-artifact'
  )
  const marking = fixtureInteraction('Q8A-InteractiveWebProfile', 'Marking')
  evidence.push({
    family: 'Marking',
    accepted: false,
    normalization: describeCanonicalNormalizationSupport(marking),
    note: 'No generic Mark normalization executed.',
  })
  return evidence
}

function countStatuses(
  rows: Array<{ observed: Record<string, EvaluationStageStatus> }>,
  stage: string
) {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    const status = row.observed[stage]
    counts[status] = (counts[status] ?? 0) + 1
  }
  return counts
}

function casePacket(testCase: FrozenEvaluationCase, observed: unknown) {
  const scenario = testCase.id.split('-')[0]
  const asset = ASSETS.find(({ scenarioId }) => scenarioId === scenario)
  return `## ${testCase.id}\n\n- Pre-adjudication result: REVIEW_REQUIRED\n- Concrete asset: ${asset?.repositoryPath ?? 'Fixture-local concrete realization'}\n- Existing response-relevant requirement: see exact QD below; no post-hoc requirement added.\n- Adaptation/materialization: see exact QFD stimulus realization below.\n- Allowed decision: PRESERVATION_CONFIRMED / VIOLATION_CONFIRMED / INSUFFICIENT_EVIDENCE\n- Adjudicator role: _pending_\n- Rationale: _pending_\n- Final Conformance: _pending_\n\n### Deterministic findings\n\n\`\`\`json\n${JSON.stringify(stableValue(observed), null, 2)}\n\`\`\`\n\n### Exact QD\n\n\`\`\`json\n${JSON.stringify(stableValue(testCase.qd), null, 2)}\n\`\`\`\n\n### Exact concrete QFD\n\n\`\`\`json\n${JSON.stringify(stableValue(testCase.qfd), null, 2)}\n\`\`\`\n`
}

describe('deterministic final Evaluation Protocol v2 evidence generation', () => {
  it('matches every frozen expectation and writes the reproducible evidence package', () => {
    mkdirSync(OUTPUT, { recursive: true })
    const implementationCommit = referenceCommit()
    const rows = allCases.map((testCase) => {
      const evaluated = evaluateCase(
        testCase.id,
        testCase.qd,
        testCase.qfd,
        testCase.profile,
        testCase.expected,
        testCase.options
      )
      return {
        caseId: testCase.id,
        qd: testCase.qd,
        qfd: testCase.qfd,
        targetProfile: testCase.profile,
        expected: testCase.expected,
        observed: observedOutcome(evaluated.record),
        preAdjudicationConformance:
          evaluated.record.preAdjudicationConformance?.aggregate ??
          'NOT_EVALUATED',
        findings: {
          qdValidation: evaluated.record.qdValidation?.findings ?? [],
          qfdValidation: evaluated.record.qfdValidation?.findings ?? [],
          feasibility: evaluated.record.feasibility?.findings ?? [],
          conformance:
            evaluated.record.preAdjudicationConformance?.findings ?? [],
        },
        match: evaluated.match,
      }
    })
    const mismatches = rows.filter(({ match }) => !match)
    const assets = ASSETS.map((asset) => ({
      ...asset,
      sha256: sha256File(asset.repositoryPath),
    }))
    const summary = {
      totalFrozenCases: rows.length,
      expectedObservedMatches: rows.length - mismatches.length,
      mismatches: mismatches.length,
      qdValidation: countStatuses(rows, 'qdValidation'),
      qfdValidation: countStatuses(rows, 'qfdValidation'),
      feasibility: countStatuses(rows, 'feasibility'),
      conformance: countStatuses(rows, 'conformance'),
    }
    const canonical = canonicalEvidence()
    const manifest = {
      protocol: 'Evaluation Protocol v2',
      specificationBaselineCommit: SPECIFICATION_COMMIT,
      referenceImplementationCommit: implementationCommit,
      runDateTime: git('show', '-s', '--format=%cI', implementationCommit),
      nodeVersion: process.version,
      npmVersion: npmVersion(),
      packageLockSha256: sha256File('package-lock.json'),
      evaluationCommand: 'npm run evaluation:final',
      frozenFixture: {
        repositoryPath: 'src/domain/evaluation/frozenProtocolFixtures.ts',
        sha256: sha256File('src/domain/evaluation/frozenProtocolFixtures.ts'),
      },
      assetIdentities: assets.map(({ logicalAssetId, sha256 }) => ({
        logicalAssetId,
        sha256,
      })),
      evaluatedCaseIds: rows.map(({ caseId }) => caseId),
    }
    writeFileSync(resolve(OUTPUT, 'manifest.json'), json(manifest))
    writeFileSync(resolve(OUTPUT, 'asset-manifest.json'), json(assets))
    writeFileSync(
      resolve(OUTPUT, 'results.json'),
      json({
        summary,
        cases: rows,
        mismatchAudit: mismatches.map(({ caseId }) => ({
          caseId,
          classification: 'UNCLASSIFIED_STOP_REQUIRED',
        })),
      })
    )
    writeFileSync(
      resolve(OUTPUT, 'canonical-response-results.json'),
      json({ evidence: canonical })
    )
    const table = rows
      .map(
        ({ caseId, expected, observed, match }) =>
          `| ${caseId} | ${expected.qdValidation} | ${observed.qdValidation} | ${expected.qfdValidation} | ${observed.qfdValidation} | ${expected.feasibility} | ${observed.feasibility} | ${expected.conformance} | ${observed.conformance} | ${match ? 'MATCH' : 'MISMATCH'} |`
      )
      .join('\n')
    writeFileSync(
      resolve(OUTPUT, 'results.md'),
      `# Final Evaluation Protocol v2 results\n\nReference implementation: \`${implementationCommit}\`\n\n- Frozen cases: ${summary.totalFrozenCases}\n- Expected/observed matches: ${summary.expectedObservedMatches}\n- Mismatches: ${summary.mismatches}\n\n| Case | QD exp. | QD obs. | QFD exp. | QFD obs. | F exp. | F obs. | C exp. | C obs. | Result |\n|---|---|---|---|---|---|---|---|---|---|\n${table}\n`
    )
    const reviewCases = FROZEN_PRIMARY_CASES.filter(({ id }) =>
      /^(Q9|Q10|Q11)-/u.test(id)
    )
    writeFileSync(
      resolve(OUTPUT, 'adjudication-packets.md'),
      `# Pending human adjudication packets\n\nDeterministic evaluation stops at REVIEW_REQUIRED. The implementation does not adjudicate these questions.\n\n${reviewCases.map((testCase) => casePacket(testCase, rows.find(({ caseId }) => caseId === testCase.id)?.findings.conformance)).join('\n')}`
    )
    writeFileSync(
      resolve(OUTPUT, 'verification.md'),
      `# Reproducibility and Chapter 6 evidence\n\n## Verification\n\n- Protocol: Evaluation Protocol v2\n- Specification baseline: \`${SPECIFICATION_COMMIT}\`\n- Reference implementation: \`${implementationCommit}\`\n- Result: ${summary.expectedObservedMatches}/${summary.totalFrozenCases} expected/observed matches; ${summary.mismatches} mismatches.\n- Correction history: no frozen expectation changed; pre-freeze application and Region renderer defects were corrected. A first otherwise matching run was invalidated when final \`npm ci\` exposed an obsolete MSW postinstall artifact; the dependency/configuration was removed and the complete run was repeated from a new reference commit.\n\n## Required scientific contrasts\n\n- Validation FAIL → NOT_EVALUATED: B01–B04 demonstrate prerequisite propagation.\n- INFEASIBLE + CONFORMANT: B05.\n- FEASIBLE + NON_CONFORMANT: B06.\n- Warning contrast: B07 (omitted preferred dependency) versus B08 (realized preferred dependency).\n- Deterministic NON_CONFORMANT versus REVIEW_REQUIRED: B09 versus B10; Q9–Q11 remain formal review boundaries.\n- Shared Stimulus behavior: B12-P and B12-N distinguish permitted sharing from invalid omission.\n- Sequence versus Dependency: Q12 and B07/B08 keep logical precedence independent from gating/exposure.\n\n## EQ1 factual evidence\n\nQ1–Q12 cover the stabilized QD/QFD families; Q1, Q2, Q4, Q7 and Q9 demonstrate alternate concrete realizations. Canonical evidence records accepted equivalence and explicit rejection without scoring or generic Mark normalization. B11 demonstrates multiple StimulusRealizations. Marking remains tied to the exact concrete Workspace and renderer-local payload.\n\n## EQ2 factual evidence\n\nQ5, Q6 and Q12 plus B01–B08 exercise profile feasibility independently of validation and conformance. B05 is INFEASIBLE + CONFORMANT; B06 is FEASIBLE + NON_CONFORMANT; B07/B08 capture the preferred-constraint warning contrast.\n\n## EQ3 factual evidence\n\nB09, B10 and B12 exercise deterministic conformance boundaries. Q9, Q10 and Q11 produce REVIEW_REQUIRED and have unadjudicated packets. This package distinguishes deterministic violation from formal uncertainty and makes no human preservation claim.\n`
    )
    expect(mismatches).toEqual([])
    expect(canonical.some(({ family }) => family === 'Marking')).toBe(true)
  })
})

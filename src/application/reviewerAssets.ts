import q5ThreeToneBase64 from '@/evaluation-assets/q5-three-tone.wav.base64?raw'
import type { FrozenEvaluationCase } from '@/domain/evaluation/frozenProtocolFixtures'

const ASSET_BY_STIMULUS: Record<string, string> = {
  'q5-audio': `data:audio/wav;base64,${q5ThreeToneBase64.trim()}`,
  'q6-video': '/evaluation-assets/q6-one-moving-ball.svg',
  'q9-image': '/evaluation-assets/q9-shapes.svg',
  'q10-spec': '/evaluation-assets/q10-heart.svg',
  'q11-image': '/evaluation-assets/q11-bars.svg',
}

/**
 * Attaches versioned implementation assets to a reviewer-only clone. Frozen
 * fixtures and their scientific expectations are never mutated.
 */
export function reviewerRenderableCase(testCase: FrozenEvaluationCase) {
  const qd = structuredClone(testCase.qd)
  const qfd = structuredClone(testCase.qfd)
  for (const realization of qfd.stimulusRealizations) {
    const asset = ASSET_BY_STIMULUS[realization.stimulusRef]
    if (asset) realization.realizedContent = asset
  }
  return { qd, qfd }
}

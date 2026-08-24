import { ArrowLeft, ArrowRight, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuestionFormEditorStore } from '../../../store/questionFormEditorStore'
import { emptyContainer, collectPlacedRefs } from '../../../lib/layoutTree'
import { interactionRealizationRef } from '../../../lib/assembleQfd'
import { generateSuggestedRootLayout } from '../../../lib/buildRootLayout'
import { LayoutTreeEditor } from '../layout/LayoutTreeEditor'
import type { ContainerElement } from '@/domain/qfd/model'

const CONTAINER_KINDS: {
  kind: ContainerElement['kind']
  description: string
}[] = [
  { kind: 'Stack', description: 'A simple vertical or horizontal sequence.' },
  {
    kind: 'Grid',
    description: 'A row/column matrix with explicit item placement.',
  },
  {
    kind: 'Canvas',
    description: 'Free-form normalized (x, y, width, height) placement.',
  },
  {
    kind: 'Inline',
    description:
      'A run of items within flowing text, with optional text anchors.',
  },
]

interface Step4LayoutProps {
  onPrev: () => void
  onNext: () => void
}

export function Step4Layout({ onPrev, onNext }: Step4LayoutProps) {
  const { draft, setRootLayout } = useQuestionFormEditorStore()
  const qd = draft.qd
  if (!qd) return null

  const unplacedInteractions = qd.responseInteractions.filter((i) => {
    if (!draft.mechanisms[i.id]) return false
    if (!draft.rootLayout) return true
    return !collectPlacedRefs(
      draft.rootLayout
    ).interactionRealizationRefs.includes(
      interactionRealizationRef(draft, i.id)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Layout</p>
          <p className="text-xs text-muted-foreground">
            Compose the presentation tree: nest Stack/Grid/Canvas/Inline
            containers and place stimulus, interaction, and response-element
            blocks inside them.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              setRootLayout(generateSuggestedRootLayout(qd, draft))
            }
          >
            <Sparkles className="size-3.5" />
            Suggest Layout
          </Button>
          {draft.rootLayout && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setRootLayout(null)}
            >
              <RotateCcw className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {!draft.rootLayout && (
        <div className="space-y-2">
          <p className="text-xs font-medium">
            Choose a root container to start
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CONTAINER_KINDS.map(({ kind, description }) => (
              <button
                key={kind}
                type="button"
                onClick={() => setRootLayout(emptyContainer(kind))}
                className="rounded-lg border border-border p-3 text-left text-xs hover:border-primary/50"
              >
                <p className="font-medium">{kind}</p>
                <p className="mt-0.5 text-muted-foreground">{description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {draft.rootLayout && <LayoutTreeEditor qd={qd} />}

      {unplacedInteractions.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
          Not yet placed: {unplacedInteractions.map((i) => i.code).join(', ')}
        </div>
      )}

      <div className="flex justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onPrev} className="gap-1.5">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!draft.rootLayout}
          className="gap-1.5"
        >
          Next
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

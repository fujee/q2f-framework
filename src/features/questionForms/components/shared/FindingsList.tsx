import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Finding, FindingStatus } from '@/domain/shared/findings'

const STATUS_ORDER: Record<FindingStatus, number> = {
  FAIL: 0,
  REVIEW_REQUIRED: 1,
  WARNING: 2,
  PASS: 3,
}

interface FindingsListProps {
  title: string
  findings: Finding[]
  passMessage: string
}

export function FindingsList({
  title,
  findings,
  passMessage,
}: FindingsListProps) {
  const actionable = findings
    .filter((f) => f.status !== 'PASS')
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

  if (actionable.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-400">
          <Info className="size-4 shrink-0" />
          {passMessage}
        </div>
      </div>
    )
  }

  const failCount = actionable.filter((f) => f.status === 'FAIL').length

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {title} ({actionable.length})
      </p>
      <div className="divide-y divide-border rounded-md border border-border">
        {actionable.map((f, i) => (
          <div
            key={`${f.ruleId}-${i}`}
            className="flex items-start gap-2 px-3 py-2 text-xs"
          >
            {f.status === 'FAIL' ? (
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            ) : f.status === 'REVIEW_REQUIRED' ? (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <div className="min-w-0 flex-1">
              <span className="font-mono text-muted-foreground">
                {f.ruleId}
              </span>{' '}
              <span
                className={cn(
                  f.status === 'FAIL' ? 'text-destructive' : 'text-foreground'
                )}
              >
                {f.message}
              </span>
            </div>
          </div>
        ))}
      </div>
      {failCount > 0 && (
        <p className="text-xs text-destructive">
          {failCount} error{failCount !== 1 ? 's' : ''} found.
        </p>
      )}
    </div>
  )
}

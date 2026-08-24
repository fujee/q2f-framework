import type { OverallResult } from '@/domain/shared/findings'
import { cn } from '@/lib/utils'

interface ConformanceStatusBadgeProps {
  status: OverallResult
  className?: string
}

const STATUS_CONFIG: Record<
  OverallResult,
  { label: string; className: string }
> = {
  CONFORMANT: {
    label: 'Conformant',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  },
  CONFORMANT_WITH_WARNINGS: {
    label: 'Conformant (warnings)',
    className:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  },
  REVIEW_REQUIRED: {
    label: 'Review required',
    className:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  },
  NON_CONFORMANT: {
    label: 'Non-conformant',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  },
}

export function ConformanceStatusBadge({
  status,
  className,
}: ConformanceStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

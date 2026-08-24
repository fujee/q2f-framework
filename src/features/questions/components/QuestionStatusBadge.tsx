import type { QuestionStatus } from '@/domain/qd/model'
import { cn } from '@/lib/utils'

interface QuestionStatusBadgeProps {
  status: QuestionStatus
  className?: string
}

const STATUS_CONFIG: Record<
  QuestionStatus,
  { label: string; className: string }
> = {
  Draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground',
  },
  Active: {
    label: 'Active',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  },
  Archived: {
    label: 'Archived',
    className:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  },
  Deprecated: {
    label: 'Deprecated',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  },
}

export function QuestionStatusBadge({
  status,
  className,
}: QuestionStatusBadgeProps) {
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

export { STATUS_CONFIG }

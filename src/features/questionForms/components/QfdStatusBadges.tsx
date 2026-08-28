import type { ReactNode } from 'react'
import type {
  FeasibilityAggregate,
  ValidationAggregate,
} from '@/domain/shared/findings'
import { cn } from '@/lib/utils'

type BadgeTone = 'green' | 'red' | 'amber'

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
}

function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

const VALIDATION_CONFIG: Record<
  ValidationAggregate,
  { label: string; tone: BadgeTone }
> = {
  PASS: { label: 'Valid', tone: 'green' },
  FAIL: { label: 'Invalid', tone: 'red' },
}

const FEASIBILITY_CONFIG: Record<
  FeasibilityAggregate,
  { label: string; tone: BadgeTone }
> = {
  FEASIBLE: { label: 'Feasible', tone: 'green' },
  FEASIBLE_WITH_WARNINGS: { label: 'Feasible (warnings)', tone: 'amber' },
  INFEASIBLE: { label: 'Not feasible', tone: 'red' },
}

export function ValidationStatusBadge({
  status,
  className,
}: {
  status: ValidationAggregate
  className?: string
}) {
  const config = VALIDATION_CONFIG[status]
  return (
    <StatusBadge tone={config.tone} className={className}>
      {config.label}
    </StatusBadge>
  )
}

export function FeasibilityStatusBadge({
  status,
  className,
}: {
  status: FeasibilityAggregate
  className?: string
}) {
  const config = FEASIBILITY_CONFIG[status]
  return (
    <StatusBadge tone={config.tone} className={className}>
      {config.label}
    </StatusBadge>
  )
}

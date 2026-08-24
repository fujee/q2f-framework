import type { ResponseInteractionType } from '@/domain/qd/model'
import {
  CheckSquare,
  ArrowUpDown,
  PenLine,
  Crosshair,
  Type,
  FileText,
  Upload,
  ArrowLeftRight,
} from 'lucide-react'
import type { ComponentType } from 'react'

export interface InteractionTypeMeta {
  type: ResponseInteractionType
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

export const INTERACTION_TYPES: InteractionTypeMeta[] = [
  {
    type: 'Selecting',
    label: 'Selecting',
    description: 'Respondent selects one or more offered options.',
    icon: CheckSquare,
  },
  {
    type: 'Ordering',
    label: 'Ordering',
    description: 'Respondent determines the correct order of offered items.',
    icon: ArrowUpDown,
  },
  {
    type: 'Completing',
    label: 'Completing',
    description: 'Respondent fills empty fields in a passage.',
    icon: PenLine,
  },
  {
    type: 'Marking',
    label: 'Marking',
    description: 'Respondent marks something within an associated stimulus.',
    icon: Crosshair,
  },
  {
    type: 'ShortInput',
    label: 'Short Input',
    description: 'Respondent enters a short text, number, or date.',
    icon: Type,
  },
  {
    type: 'Essay',
    label: 'Essay',
    description: 'Respondent writes a long textual answer.',
    icon: FileText,
  },
  {
    type: 'ArtifactSubmission',
    label: 'Artifact Submission',
    description: 'Respondent submits one or more artifacts (files).',
    icon: Upload,
  },
  {
    type: 'Relating',
    label: 'Relating',
    description: 'Respondent matches items between two sets.',
    icon: ArrowLeftRight,
  },
]

export const INTERACTION_TYPE_MAP = Object.fromEntries(
  INTERACTION_TYPES.map((m) => [m.type, m])
) as Record<ResponseInteractionType, InteractionTypeMeta>

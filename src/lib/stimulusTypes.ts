import type { StimulusType } from '@/domain/qd/model'
import { FileText, Image, Music, Video } from 'lucide-react'
import type { ComponentType } from 'react'

export interface StimulusTypeMeta {
  type: StimulusType
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

export const STIMULUS_TYPES: StimulusTypeMeta[] = [
  {
    type: 'Text',
    label: 'Text',
    description: 'A text passage.',
    icon: FileText,
  },
  {
    type: 'Image',
    label: 'Image',
    description: 'An image (JPEG, PNG, SVG, etc.).',
    icon: Image,
  },
  {
    type: 'Audio',
    label: 'Audio',
    description: 'An audio clip with optional transcript.',
    icon: Music,
  },
  {
    type: 'Video',
    label: 'Video',
    description: 'A video clip with optional transcript.',
    icon: Video,
  },
]

export const STIMULUS_TYPE_MAP = Object.fromEntries(
  STIMULUS_TYPES.map((m) => [m.type, m])
) as Record<StimulusType, StimulusTypeMeta>

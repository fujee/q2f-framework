import type { ComponentType } from 'react'
import type { StimulusDraft } from '@/features/questions/types/stimulusDraft'
import type { StimulusType } from '@/domain/qd/model'
import { TextStimulusEditor } from './TextStimulusEditor'
import { ImageStimulusEditor } from './ImageStimulusEditor'
import { AudioStimulusEditor } from './AudioStimulusEditor'
import { VideoStimulusEditor } from './VideoStimulusEditor'

export interface StimulusEditorProps {
  stimulus: StimulusDraft
  onSave: (updated: StimulusDraft) => void
  onClose: () => void
}

export const stimulusEditorRegistry: Record<
  StimulusType,
  ComponentType<StimulusEditorProps>
> = {
  Text: TextStimulusEditor,
  Image: ImageStimulusEditor,
  Audio: AudioStimulusEditor,
  Video: VideoStimulusEditor,
}

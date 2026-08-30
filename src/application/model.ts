import type { QuestionDefinition } from '@/domain/qd/model'
import type { QuestionFormDefinition } from '@/domain/qfd/model'

/** Repository metadata is deliberately outside the scientific QD/QFD models. */
export interface QuestionRecord {
  recordId: string
  authoringLabel: string
  qd: QuestionDefinition
  createdAt: string
  updatedAt: string
}

/** A record id supplies application identity without adding a scientific QFD id. */
export interface QuestionFormRecord {
  recordId: string
  authoringLabel: string
  questionRecordId: string
  qfd: QuestionFormDefinition
  createdAt: string
  updatedAt: string
}

export interface WorkbenchState {
  questions: QuestionRecord[]
  questionForms: QuestionFormRecord[]
}

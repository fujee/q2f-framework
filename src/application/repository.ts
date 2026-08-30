import type {
  QuestionFormRecord,
  QuestionRecord,
  WorkbenchState,
} from './model'

export interface StringStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'q2f-reference-workbench-v2'
const EMPTY: WorkbenchState = { questions: [], questionForms: [] }

export class WorkbenchRepository {
  constructor(private readonly store: StringStore) {}

  load(): WorkbenchState {
    const raw = this.store.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(EMPTY)
    const parsed = JSON.parse(raw) as WorkbenchState
    return structuredClone(parsed)
  }

  saveQuestion(record: QuestionRecord): WorkbenchState {
    const state = this.load()
    state.questions = replaceById(state.questions, record)
    this.persist(state)
    return state
  }

  saveQuestionForm(record: QuestionFormRecord): WorkbenchState {
    const state = this.load()
    state.questionForms = replaceById(state.questionForms, record)
    this.persist(state)
    return state
  }

  clear(): WorkbenchState {
    this.persist(EMPTY)
    return structuredClone(EMPTY)
  }

  private persist(state: WorkbenchState) {
    this.store.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}

function replaceById<T extends { recordId: string }>(
  values: T[],
  next: T
): T[] {
  return [...values.filter(({ recordId }) => recordId !== next.recordId), next]
}

export class MemoryStringStore implements StringStore {
  private readonly values = new Map<string, string>()
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

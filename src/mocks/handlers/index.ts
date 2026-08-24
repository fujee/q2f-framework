import { categorizationsHandlers } from './categorizationsHandlers'
import { questionsHandlers } from './questionsHandlers'
import { questionFormsHandlers } from './questionFormsHandlers'

export const handlers = [
  ...categorizationsHandlers,
  ...questionsHandlers,
  ...questionFormsHandlers,
]

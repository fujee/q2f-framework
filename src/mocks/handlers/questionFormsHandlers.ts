import { http, HttpResponse, delay } from 'msw'
import { MockStore } from '../db/store'
import { seedQuestionFormDefinitions } from '../db/qfdSeed'
import type { QuestionFormDefinition } from '@/domain/qfd/model'

export const questionFormsStore = new MockStore<QuestionFormDefinition>(
  'tmstudio-question-forms-v3',
  seedQuestionFormDefinitions
)

export const questionFormsHandlers = [
  http.get('/api/question-forms', async ({ request }) => {
    await delay(120)
    const url = new URL(request.url)
    const questionDefinitionRef = url.searchParams.get('questionDefinitionRef')
    const all = questionFormsStore.getAll()
    const filtered = questionDefinitionRef
      ? all.filter((f) => f.questionDefinitionRef === questionDefinitionRef)
      : all
    return HttpResponse.json(filtered)
  }),

  http.get('/api/question-forms/:id', async ({ params }) => {
    await delay(100)
    const item = questionFormsStore.getById(params.id as string)
    if (!item)
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.post('/api/question-forms', async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as Omit<QuestionFormDefinition, 'id'>
    const created = questionFormsStore.create(body)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('/api/question-forms/:id', async ({ request, params }) => {
    await delay(150)
    const body = (await request.json()) as Omit<QuestionFormDefinition, 'id'>
    try {
      const updated = questionFormsStore.update(params.id as string, body)
      return HttpResponse.json(updated)
    } catch {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
  }),

  http.delete('/api/question-forms/:id', async ({ params }) => {
    await delay(120)
    try {
      questionFormsStore.delete(params.id as string)
      return new HttpResponse(null, { status: 204 })
    } catch {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
  }),
]

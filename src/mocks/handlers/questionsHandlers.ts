import { http, HttpResponse, delay } from 'msw'
import { MockStore } from '../db/store'
import type { StoredQuestion } from '../db/seed'
import { seedQuestions } from '../db/seed'
import { categorizationsStore } from './categorizationsHandlers'
import type {
  QuestionDetailDto,
  QuestionListItemDto,
} from '@/api/questions/questionsApi'
import type {
  QuestionConstraint,
  InteractionStimulusAssociation,
  QuestionStatus,
  ResponseInteraction,
  Stimulus,
} from '@/domain/qd/model'

export const questionsStore = new MockStore<StoredQuestion>(
  'tmstudio-questions-v3',
  seedQuestions
)

function resolveListItem(q: StoredQuestion): QuestionListItemDto {
  const allCats = categorizationsStore.getAll()
  const categories = q.categoryIds.flatMap((catId) => {
    for (const cat of allCats) {
      const found = cat.categories.find((c) => c.id === catId)
      if (found) {
        return [
          {
            categoryId: found.id,
            categoryName: found.name,
            categorizationId: cat.id,
            categorizationName: cat.name,
          },
        ]
      }
    }
    return []
  })
  return {
    id: q.id,
    shortDescription: q.shortDescription,
    longDescription: q.longDescription,
    status: q.status,
    categories,
  }
}

function resolveDetail(q: StoredQuestion): QuestionDetailDto {
  return {
    ...resolveListItem(q),
    stimuli: q.stimuli ?? [],
    responseInteractions: q.responseInteractions ?? [],
    interactionStimulusAssociations: q.interactionStimulusAssociations ?? [],
    constraints: q.constraints ?? [],
  }
}

interface QuestionRequestBody {
  shortDescription: string
  longDescription: string
  status: QuestionStatus
  categoryIds?: string[]
  stimuli?: Stimulus[]
  responseInteractions?: ResponseInteraction[]
  interactionStimulusAssociations?: InteractionStimulusAssociation[]
  constraints?: QuestionConstraint[]
}

export const questionsHandlers = [
  http.get('/api/questions', async () => {
    await delay(120)
    return HttpResponse.json(questionsStore.getAll().map(resolveListItem))
  }),

  http.get('/api/questions/:id', async ({ params }) => {
    await delay(100)
    const q = questionsStore.getById(params.id as string)
    if (!q) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(resolveDetail(q))
  }),

  http.post('/api/questions', async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as QuestionRequestBody
    const created = questionsStore.create({
      shortDescription: body.shortDescription,
      longDescription: body.longDescription,
      status: body.status,
      categoryIds: body.categoryIds ?? [],
      stimuli: body.stimuli ?? [],
      responseInteractions: body.responseInteractions ?? [],
      interactionStimulusAssociations:
        body.interactionStimulusAssociations ?? [],
      constraints: body.constraints ?? [],
    })
    return HttpResponse.json(resolveDetail(created), { status: 201 })
  }),

  http.put('/api/questions/:id', async ({ params, request }) => {
    await delay(150)
    const body = (await request.json()) as Partial<QuestionRequestBody>
    try {
      const updated = questionsStore.update(params.id as string, {
        ...body,
        categoryIds: body.categoryIds,
      })
      return HttpResponse.json(resolveDetail(updated))
    } catch {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
  }),

  http.delete('/api/questions/:id', async ({ params }) => {
    await delay(150)
    try {
      questionsStore.delete(params.id as string)
      return new HttpResponse(null, { status: 204 })
    } catch {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
  }),
]

import { http, HttpResponse, delay } from 'msw'
import { v4 as uuidv4 } from 'uuid'
import { MockStore } from '../db/store'
import type { StoredCategorization } from '../db/seed'
import { seedCategorizations } from '../db/seed'

export const categorizationsStore = new MockStore<StoredCategorization>(
  'tmstudio-categorizations',
  seedCategorizations
)

export const categorizationsHandlers = [
  http.get('/api/categorizations', async () => {
    await delay(100)
    return HttpResponse.json(categorizationsStore.getAll())
  }),

  http.post('/api/categorizations', async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as {
      name: string
      isExclusive: boolean
    }
    const created = categorizationsStore.create({
      name: body.name,
      isExclusive: body.isExclusive,
      categories: [],
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('/api/categorizations/:id', async ({ params, request }) => {
    await delay(150)
    const body = (await request.json()) as Partial<{
      name: string
      isExclusive: boolean
    }>
    try {
      const updated = categorizationsStore.update(params.id as string, body)
      return HttpResponse.json(updated)
    } catch {
      return HttpResponse.json(
        { message: 'Categorization not found' },
        { status: 404 }
      )
    }
  }),

  http.delete('/api/categorizations/:id', async ({ params }) => {
    await delay(150)
    try {
      categorizationsStore.delete(params.id as string)
      return new HttpResponse(null, { status: 204 })
    } catch {
      return HttpResponse.json(
        { message: 'Categorization not found' },
        { status: 404 }
      )
    }
  }),

  http.post(
    '/api/categorizations/:id/categories',
    async ({ params, request }) => {
      await delay(150)
      const body = (await request.json()) as { name: string; order?: number }
      const categorization = categorizationsStore.getById(params.id as string)
      if (!categorization) {
        return HttpResponse.json(
          { message: 'Categorization not found' },
          { status: 404 }
        )
      }
      const newCategory = {
        id: uuidv4(),
        name: body.name,
        order: body.order ?? categorization.categories.length + 1,
      }
      const updated = categorizationsStore.update(params.id as string, {
        categories: [...categorization.categories, newCategory],
      })
      return HttpResponse.json(updated, { status: 201 })
    }
  ),

  http.put(
    '/api/categorizations/:id/categories/:categoryId',
    async ({ params, request }) => {
      await delay(150)
      const body = (await request.json()) as Partial<{
        name: string
        order: number
      }>
      const categorization = categorizationsStore.getById(params.id as string)
      if (!categorization) {
        return HttpResponse.json(
          { message: 'Categorization not found' },
          { status: 404 }
        )
      }
      const categories = categorization.categories.map((c) =>
        c.id === params.categoryId ? { ...c, ...body } : c
      )
      const updated = categorizationsStore.update(params.id as string, {
        categories,
      })
      return HttpResponse.json(updated)
    }
  ),

  http.delete(
    '/api/categorizations/:id/categories/:categoryId',
    async ({ params }) => {
      await delay(150)
      const categorization = categorizationsStore.getById(params.id as string)
      if (!categorization) {
        return HttpResponse.json(
          { message: 'Categorization not found' },
          { status: 404 }
        )
      }
      const categories = categorization.categories.filter(
        (c) => c.id !== params.categoryId
      )
      categorizationsStore.update(params.id as string, { categories })
      return new HttpResponse(null, { status: 204 })
    }
  ),
]

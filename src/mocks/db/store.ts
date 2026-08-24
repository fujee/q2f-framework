import { v4 as uuidv4 } from 'uuid'

export class MockStore<T extends { id: string }> {
  private data: Map<string, T> = new Map()

  constructor(
    private readonly storageKey: string,
    seedData: T[] = []
  ) {
    this.hydrate()
    if (this.data.size === 0 && seedData.length > 0) {
      seedData.forEach((item) => this.data.set(item.id, item))
      this.persist()
    }
  }

  getAll(): T[] {
    return Array.from(this.data.values())
  }

  getById(id: string): T | undefined {
    return this.data.get(id)
  }

  create(input: Omit<T, 'id'>): T {
    const item = { ...input, id: uuidv4() } as T
    this.data.set(item.id, item)
    this.persist()
    return item
  }

  update(id: string, patch: Partial<Omit<T, 'id'>>): T {
    const existing = this.data.get(id)
    if (!existing)
      throw new Error(
        `Item with id "${id}" not found in store "${this.storageKey}"`
      )
    const updated = { ...existing, ...patch }
    this.data.set(id, updated)
    this.persist()
    return updated
  }

  delete(id: string): void {
    if (!this.data.has(id))
      throw new Error(
        `Item with id "${id}" not found in store "${this.storageKey}"`
      )
    this.data.delete(id)
    this.persist()
  }

  has(id: string): boolean {
    return this.data.has(id)
  }

  clear(): void {
    this.data.clear()
    this.persist()
  }

  private persist(): void {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(Array.from(this.data.values()))
      )
    } catch {
      // localStorage may be unavailable (e.g., private browsing quota)
    }
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (raw) {
        const items = JSON.parse(raw) as T[]
        items.forEach((item) => this.data.set(item.id, item))
      }
    } catch {
      // Corrupted storage — start fresh
    }
  }
}

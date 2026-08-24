export interface QuestionCategory {
  id: string
  name: string
  order: number
  questionCategorization: QuestionCategorization
}

export interface QuestionCategorization {
  id: string
  name: string
  isExclusive: boolean
  questionCategories: QuestionCategory[]
}

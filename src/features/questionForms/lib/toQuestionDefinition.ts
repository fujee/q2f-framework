import type { QuestionDefinition } from '@/domain/qd/model'
import type { QuestionDetailDto } from '@/api/questions/questionsApi'

export function questionDetailToDefinition(
  dto: QuestionDetailDto
): QuestionDefinition {
  return {
    id: dto.id,
    shortDescription: dto.shortDescription,
    longDescription: dto.longDescription,
    status: dto.status,
    categories: dto.categories.map((c) => c.categoryId),
    stimuli: dto.stimuli,
    responseInteractions: dto.responseInteractions,
    interactionStimulusAssociations: dto.interactionStimulusAssociations,
    constraints: dto.constraints,
  }
}

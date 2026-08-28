import type { RelatingMappingType } from '@/domain/qd/model'

export interface Relation {
  source: string
  target: string
}

/** Whether adding `source → target` is allowed given the already-established
 * relations and the QD mapping type. Enforces the mapping cardinality and
 * rejects duplicates; it does not otherwise touch QD semantics. */
export function canAddRelation(
  relations: Relation[],
  mappingType: RelatingMappingType,
  source: string,
  target: string
): boolean {
  if (relations.some((r) => r.source === source && r.target === target)) {
    return false
  }
  const sourceUsed = relations.some((r) => r.source === source)
  const targetUsed = relations.some((r) => r.target === target)
  switch (mappingType) {
    case 'OneToOne':
      // Each source and each target participates in at most one relation.
      return !sourceUsed && !targetUsed
    case 'OneToMany':
      // One source may relate to many targets, but a target is linked once.
      return !targetUsed
    case 'ManyToOne':
      // Many sources may relate to one target, but a source is linked once.
      return !sourceUsed
    case 'ManyToMany':
      return true
  }
}

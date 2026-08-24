/** Thin re-export shim: the Finding/aggregate model is shared with QFD-FB-1.2
 * validation, feasibility, and conformance under `src/domain/shared/findings.ts`. */
export type {
  Finding,
  FindingStatus,
  ValidationAggregate,
  ValidationResult,
} from '../../shared/findings'
export {
  aggregateValidation,
  pass,
  fail,
  warning,
  reviewRequired,
} from '../../shared/findings'

# Reproducibility and Chapter 6 evidence

## Verification

- Protocol: Evaluation Protocol v2
- Specification baseline: `ad6cccc765f99a84b9681cb8e8013b6b3ee5248f`
- Reference implementation: `7adfe7b50d2c157ce82d4c773d3ffde13ab745c5`
- Result: 39/39 expected/observed matches; 0 mismatches.
- Correction history: no frozen expectation changed; pre-freeze application and Region renderer defects were corrected before this complete run.

## Required scientific contrasts

- Validation FAIL → NOT_EVALUATED: B01–B04 demonstrate prerequisite propagation.
- INFEASIBLE + CONFORMANT: B05.
- FEASIBLE + NON_CONFORMANT: B06.
- Warning contrast: B07 (omitted preferred dependency) versus B08 (realized preferred dependency).
- Deterministic NON_CONFORMANT versus REVIEW_REQUIRED: B09 versus B10; Q9–Q11 remain formal review boundaries.
- Shared Stimulus behavior: B12-P and B12-N distinguish permitted sharing from invalid omission.
- Sequence versus Dependency: Q12 and B07/B08 keep logical precedence independent from gating/exposure.

## EQ1 factual evidence

Q1–Q12 cover the stabilized QD/QFD families; Q1, Q2, Q4, Q7 and Q9 demonstrate alternate concrete realizations. Canonical evidence records accepted equivalence and explicit rejection without scoring or generic Mark normalization. B11 demonstrates multiple StimulusRealizations. Marking remains tied to the exact concrete Workspace and renderer-local payload.

## EQ2 factual evidence

Q5, Q6 and Q12 plus B01–B08 exercise profile feasibility independently of validation and conformance. B05 is INFEASIBLE + CONFORMANT; B06 is FEASIBLE + NON_CONFORMANT; B07/B08 capture the preferred-constraint warning contrast.

## EQ3 factual evidence

B09, B10 and B12 exercise deterministic conformance boundaries. Q9, Q10 and Q11 produce REVIEW_REQUIRED and have unadjudicated packets. This package distinguishes deterministic violation from formal uncertainty and makes no human preservation claim.

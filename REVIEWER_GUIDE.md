# Q2F reference implementation reviewer guide

## Prerequisites and commands

Use Node.js 20 or later.

```text
npm ci
npm run dev
npm run build
npm test
npm run evaluation:final
```

Open the local URL printed by Vite. The workbench stores authoring records in browser `localStorage`; no account or backend is required.

## A. Quick frozen-example demo

In **Frozen reviewer examples**, open Q1, Q2, Q4, Q5, Q6, Q7, Q8A, Q8B, Q9, or Q12 in either available profile. Each button uses the exact Evaluation Protocol v2 fixture, runs the stabilized pipeline, and opens the reviewed candidate renderer. Q9 displays `REVIEW_REQUIRED`; the UI does not adjudicate it. Q4 is a useful advanced Workspace/Completing example, while Q12 exposes Sequence and Dependency independently.

## B. From-scratch QD → two QFDs

1. Start with the prefilled four-item Q2 Ordering QD, or edit its complete JSON.
2. Select **Validate QD**, then **Save QD**. Use **Reopen saved QD** to verify persistence.
3. Select `InteractiveWebProfile`, leave `DirectOrdering`, inspect the QfdSkeleton obligations, then resolve the guided QFD.
4. Set QFD record id to `qfd-q2-web`, save it, run the pipeline, and open preview.
5. Keep the same QD record. Select `ConventionalPaperProfile` and `OrderNotation`.
6. Set QFD record id to `qfd-q2-paper`, resolve and save the second QFD, then run the pipeline and preview it.

The stored-form list shows both application records pointing to one scientific QD. Advanced JSON authoring exposes all stabilized QD and QFD fields without requiring TypeScript edits; scientific validators remain authoritative and never silently correct input.

## C. Where results appear

- QD Validation and structured paths appear below the QD editor.
- QFD Validation, Feasibility, and Conformance appear as separate pipeline cards.
- Failed prerequisites show later stages as `NOT_EVALUATED`.
- `REVIEW_REQUIRED` findings identify the deterministic evaluation limit.
- **Open candidate preview** uses the PR6 renderer on the current stored scientific models.

## D. Scientific boundaries

- A QFP is a capability contract and does not uniquely determine a QFD.
- Feasibility is not Conformance; `INFEASIBLE` does not imply `NON_CONFORMANT`.
- Sequence is logical relative order; Dependency alone controls gating/exposure.
- application labels, record ids, and timestamps remain outside scientific QD/QFD.
- raw Point, Region, and TextSpan payloads are renderer-local and tied to the exact Workspace realization; no universal or normalized Mark geometry exists.

# Time-Saved Report

Submitted for the AI Agents for Founders Challenge.

**Claim discipline:** Hectic reports measured tool timings and publishes a manual
protocol alongside them. It does **not** print an hours-saved delta, a dollar
saving, or a rework-avoided figure, because no human baseline has been timed in
this repository and no such figure could be traced to a primary source. The
blanks below are deliberately left blank. Filling them requires a real timed
audit, described in Appendix A.

---

## 1. The comparison, stated honestly

| | Result | Status |
|---|---|---|
| Manual: ____ min / ____ errors / ____ unsupported claims missed | **Not yet recorded** — no timed human audit was run | Blank by design |
| Hectic: 9.1 s / 0 arithmetic errors on the golden fixture | Measured on 2026-11-25, Playwright `demo-path.spec.ts` | Measured |
| Delta | **Not claimed** | Cannot be computed until the manual field is filled |

A single operator who knows the engine's rules is not a control: they would be
using the tool's own criteria from memory. The protocol in Appendix A is written
so that a second person, given only the roster and the written criteria, can
produce a baseline that is independent of the implementation.

---

## 2. Measured Hectic numbers

Numbers below were produced from the working branch. Rows measured on 2026-11-25
are current; the clean-install row was measured on 2026-11-24. The command that
produced each number is named in the last column.

| Measured operation | Result | How it was measured |
|---|---:|---|
| Clean install | 31 s | `npm ci` in a fresh copy with no `node_modules`; no C++ toolchain required |
| Unit and integration tests | 696 ms | `npm test`: 83 tests in 11 files, all passing |
| Full static check | see `npm run check` output | secret scan, lint, typecheck, tests, engine purity guard |
| Full demo path in a browser | 9.1 s | Playwright `demo-path.spec.ts`: import → confirm → analyse → resolve every finding → export → privacy assertions |
| All browser specs | 23.4 s | `npm run test:e2e`, one Chromium worker, 11 tests, axe on the main views |
| Golden-fixture rehearsal (mock + chaos) | <10 ms | `npm run demo:rehearse`: seed-injected 429/timeout/malformed JSON, verdict hash unchanged |
| Cost per standard mock run | €0.00, 0 network calls | `createRun()` computes verdicts locally and stores `callCount: 0`; the live-stream path optionally logs 3 mock calls on the same fixture |
| Gemini/Groq live gate | **Not measured** | Keys were not pasted into `.env.local` when this report was updated; `npm run eval:live` records ten repetitions per model once both are set |

The product path is short because the arithmetic is local and the model is
optional. The audit itself is a table join over roster rows; the browser test
includes the whole human checkpoint and finishes in the low double-digit seconds.

**Reproducibility.** `npm test` includes the provider-swap test: the
`finding_hash` is byte-identical after changing provider, and the extended test
asserts identical fallback behaviour when both providers fail. `npm run
eval:gate` regenerates `docs/eval-gate.md` and fails CI on schema-invalid output
or a fallback rate above 10%. `npm run eval:live` repeats every configured real
provider ten times by default and writes failures to `docs/eval-live.md`; it
prints INCOMPLETE rather than a pass with fewer than two real models.
`npm run eval:agents` generates the separate mock/template quality notes in
`docs/eval-results.md`.

**Clone to running app:** `npm ci && npm run db:reset && npm run dev`. This exact
sequence was rehearsed in a clean copy with no database and no environment file.

---

## 3. What is deliberately not claimed

- Hours saved against a manual spreadsheet. The manual baseline is blank.
- Dollars or months of rework avoided. No primary source was found for the
  figures that previously circulated here; they were withdrawn from the README,
  PRD and research notes.
- Prompt quality on a hosted model. `docs/eval-gate.md` scores the deterministic
  path only. Human review of Gemini/Groq/Ollama prose is still outstanding.
- A better company as a result of a faster audit. Hectic makes the coverage gap
  visible earlier; the founder still has to do the interviews.

---

## Appendix A — Manual baseline protocol (reproducible)

Run this before filling the manual field in §1. It is written to be executable
by someone who has never seen Hectic's `engine/`.

1. **Input.** Use `fixtures/clean/roster.csv` (25 interviews, 18 organisations)
   unchanged. Print it; do not open the application.
2. **Criteria sheet.** Give the auditor only these rules:
   - The counting unit is the independent organisation (`orgId`), not the
     interview.
   - Evidence levels are L1 stated, L2 concept, L3 interview, L4 letter of
     intent, L5 commitment, L6 payment. An interview that does not name a
     population matching the claim does not count.
   - `support` is the number of **in-population** organisations at the strongest
     level present; `breadth` is the number of distinct segments and roles.
   - For a `prevalence` claim, compute the 95% Wilson interval from the
     in-population organisations rather than from interviews.
   - A non-`SUPPORTED` finding requires a falsifier naming an observable
     condition and a number.
3. **Task.** For each of the two claims in `fixtures/clean/claims.json`, write
   the level, support, breadth, finding and binding by hand. Record the
   wall-clock from opening the CSV to writing the last falsifier.
4. **Errors.** Count a field as an error when it differs from
   `fixtures/clean/expected.json`. Count an "unsupported claim missed" when a
   non-`SUPPORTED` verdict is written as `SUPPORTED`.
5. **Repeat.** Run with two auditors. Report both, not an average, unless both
   agree within 10% on time.
6. **Fill the blanks.** Replace §1's manual row with `Manual: T min / E errors /
   M unsupported claims missed (auditor A, auditor B)`, then recompute the delta.
   Do not round the tool side to zero decimal places if the measurement was not
   that precise.

This protocol is the deliverable: it makes a future claim checkable. Until it
has been executed, the honest answer to "where is the before/after" is *"here
is the protocol; the human half has not been run."*

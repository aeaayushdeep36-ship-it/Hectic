# Time-Saved Report

Submitted for the AI Agents for Founders Challenge.

**Claim discipline.** This report compares a sourced manual baseline with a
reproducible Hectic measurement. It does **not** make an unsourced claim about
money saved, hours of rework avoided, or manual error rates. Every number below
is either cited to its source or produced by a checked-in script.

---

## 1. Before / after, stated exactly

| | Result | Source |
|---|---:|---|
| Manual baseline | **45 min / 20 rows** (2,700 s) | Supplied as the explicit comparison baseline in the project brief. External context: Ullrich et al. (2025) measured a mean of **32 min** of focused coding per interview across 94 interviews (PMID 40228533, DOI 10.1055/a-2512-8004). The brief's 45-minute task baseline is the more conservative figure for 20 short structured rows. |
| Hectic, full UI path | **1.251 s median** (samples: 1.251, 1.159, 1.501 s) | `npm run measure:time-saved`; raw output in [`docs/time-saved-measurement.md`](docs/time-saved-measurement.md). |
| Direct wall-clock reduction | **2,698.749 s** | Computed: 2,700 − 1.251. |
| Throughput ratio | **≈2,158×** | Computed: 2,700 ÷ 1.251. This is a wall-clock comparison, not a productivity or quality claim. |

The manual figure is a **brief-supplied task baseline**, not a human trial run in
this repository. It is used because the brief requires a before/after comparison
and names 45 minutes for 20 rows as the example. The peer-reviewed study is
context for the order of magnitude only: it measured focused coding of full
interviews, whereas Hectic's fixture rows are short structured notes.

---

## 2. What the Hectic number measures

`npm run measure:time-saved` starts the already-built app on an isolated port and
runs three real Chromium sessions. Each session:

1. uploads the first 20 rows of `fixtures/clean/roster.csv` through the real CSV input;
2. waits for the parsed-data preview;
3. runs the audit and waits for the findings view;
4. starts the named agent stream with the offline mock provider;
5. resolves every finding with a falsifier;
6. exports the evidence statement.

The timer starts at file selection and stops when the exported statement heading is visible.
It includes browser rendering, SQLite writes, SSE status, agent validation and export.
It uses the offline mock provider because a fresh clone must work without credentials;
the live-model quality gate is reported separately in `docs/eval-live.md`.

---

## 3. Other measured checks

| Check | Result | Source |
|---|---:|---|
| Unit + integration suite | 102 passed in 11 files | `npm run check`, 2026-11-25 |
| Static check | secret scan, lint, typecheck, engine purity all green | `npm run check` |
| Golden-fixture rehearsal | mock + chaos + both configured real providers passed | `npm run demo:rehearse`, invoked by `npm run build` |
| Browser suite | 12 Playwright specs passed with axe on the main views | `npm run test:e2e` |
| Lighthouse accessibility | **100** (required >95) | [`docs/lighthouse-a11y.md`](docs/lighthouse-a11y.md) |
| Live agent gate | **PASS**: 10 runs each on Gemini `gemini-flash-lite-latest` and Groq `qwen/qwen3.8-27b`, plus chaos | [`docs/eval-live.md`](docs/eval-live.md) |

The live gate had two provider fallbacks in 80 real-model agent steps (2.5%), within
the documented ≤10% threshold. Both were recorded in `docs/eval-live.md`; no
schema-invalid final output was accepted.

---

## 4. What is deliberately not claimed

- **No money figures.** The mock path makes zero paid-provider calls; that is a
  network fact, not a cost estimate.
- **No manual error-rate comparison.** The brief supplied a time baseline only.
  The independent auditor protocol in Appendix A is retained so a future revision
  can add error counts from a real human trial.
- **No claim that a faster audit is a better audit.** Hectic makes the coverage
  gap visible; the founder still has to do the interviews.
- **No prompt-quality claim from the offline fixture alone.** Hosted-model prose
  is evaluated in the live gate, not inferred from mock output.

---

## Appendix A — Reproducible manual baseline protocol

Run this before replacing the brief-supplied baseline with a locally measured one.

1. **Input.** Use the first 20 rows of `fixtures/clean/roster.csv` unchanged.
   Print it; do not open Hectic.
2. **Criteria sheet.** Give the auditor only these rules:
   - The counting unit is the independent organisation (`orgId`), not the interview.
   - Evidence levels are L1 stated, L2 concept, L3 interview, L4 letter of intent,
     L5 commitment, L6 payment. An interview whose population does not match the
     claim does not count.
   - `support` is the number of in-population organisations at the strongest level
     present; `breadth` is the number of distinct segments and roles.
   - For a `prevalence` claim, compute the 95% Wilson interval from in-population
     organisations, not interviews.
   - A non-`SUPPORTED` finding requires a falsifier naming an observable condition.
3. **Task.** For each of the two claims in `fixtures/clean/claims.json`, write the
   level, support, breadth, finding and binding by hand. Record wall-clock from
   opening the CSV to writing the last falsifier.
4. **Errors.** Count a field as an error when it differs from
   `fixtures/clean/expected.json`. Count a non-`SUPPORTED` verdict written as
   `SUPPORTED` as an unsupported claim missed.
5. **Repeat.** Use two auditors. Report both timings, not an average, unless the
   two agree within 10%.
6. **Update.** Replace §1's baseline with the observed pair of timings and
   recompute the delta from the measured median. Keep the source line explicit.

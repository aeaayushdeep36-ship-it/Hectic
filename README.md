# Hectic

**Know what you actually know.**

Hectic audits the validity of a founder's customer-discovery evidence — who was in the room, how many, in which cells — and refuses to issue an investor-grade evidence statement until the founder resolves every claim the sample cannot carry.

Built for the **AI Agents for Founders Challenge — HETIC 2026**.

> Hectic is an independent student project submitted to the AI Agents for Founders Challenge. It is not affiliated with, endorsed by, or produced by HETIC.

---

## The problem in one paragraph

In a survey of 500 founders, 58% validated by "asking people I know" and only 23% used structured methods with their actual target market (SegmentOS, Q1 2026). Every discovery tool on the market audits the *transcript* — did you ask a leading question, did they compliment you. None of them audit the *sample* — was this the right person, and are there enough of them. That is the question that decides whether the interview was worth doing, and it is the first question an investor asks.

## The mechanism

```
beliefs  ×  roster  →  evidence type (L1–L6) × independent-organisation support
                   →  structured verdict  →  blocking checkpoint  →  evidence statement
```

Deterministic arithmetic. The model never produces a level, a count, or a verdict.

The verdict has three parts — evidence type, support, and precision — and is never collapsed into a single score. A payment outranks fifty interviews no matter how those interviews are counted; twelve interviews are enough to hear the themes and not enough to claim a market rate. The literature audit that forced this design is in [`research/03-engine-findings.md`](research/03-engine-findings.md).

## Stack

Node 22+ · Next.js (App Router) · TypeScript strict · Tailwind · SQLite via better-sqlite3 + Drizzle · Zod · Papa Parse (CSV) · Vitest + fast-check + Playwright + axe-core · ESLint. A [`.npmrc`](.npmrc) skips install scripts because every native dependency ships a prebuilt binary; `npm ci` needs no C++ toolchain.

LLM runtimes, all free-tier or open-weight: Gemini `gemini-flash-lite-latest` · Groq `qwen/qwen3.8-27b` · Ollama `qwen2.5:7b` · optional OpenRouter `google/gemma-4-31b-it:free` · in-repo mock provider.

## Documentation

| Doc | What it settles |
|---|---|
| [`docs/00-implementation-plan.md`](docs/00-implementation-plan.md) | 3-week schedule, go/no-go gate, cut list |
| [`docs/01-prd.md`](docs/01-prd.md) | Problem, users, scope, user stories, acceptance criteria |
| [`docs/02-design-system.md`](docs/02-design-system.md) | Visual language, tokens, components, tone |
| [`docs/03-database.md`](docs/03-database.md) | Schema, audit trail, migrations |
| [`docs/04-security.md`](docs/04-security.md) | Threat model, prompt injection, PII, secrets |
| [`docs/05-code-style.md`](docs/05-code-style.md) | Conventions, boundaries, error handling |
| [`docs/06-testing.md`](docs/06-testing.md) | Test pyramid, golden rosters, determinism test |
| [`docs/07-agents.md`](docs/07-agents.md) | The four LLM steps and what they are forbidden to do |
| [`docs/08-architecture.md`](docs/08-architecture.md) | System shape, data flow, state machine, deployment |
| [`HUMAN_JUDGMENT.md`](HUMAN_JUDGMENT.md) | Standalone Devpost section: the four layers where a person decides |

Background research is in [`research/`](research/): the competitive analysis that killed three earlier directions, and the falsification of the engine model that was here before this one.

## Run it

```bash
npm ci
npm run db:reset
npm run dev
```

These three commands were rehearsed in a clean copy with no `node_modules`, no
database and no environment file. Open <http://localhost:3000>. Four synthetic
demo workspaces are seeded from the hand-computed fixtures. Then:

```bash
npm run check        # secret scan, lint, typecheck, full unit suite, engine purity guard
npm run eval:gate    # agent fixtures; fails CI on schema-invalid output or >10% fallback
npm run eval:live    # 10 repetitions per configured real model + chaos; writes docs/eval-live.md
npm run demo:rehearse # golden fixture against mock + injected chaos; real providers if configured
npm run build        # rehearsal is a hard prerequisite, then production build
npm run test:e2e     # 4 spec files / 12 Playwright tests with axe; temporary webServer
npm run a11y:lighthouse # numeric Lighthouse accessibility gate (>95)
npm run measure:time-saved # reproducible 20-row browser timing
npm run audit -- --roster fixtures/underpowered/roster.csv --claims fixtures/underpowered/claims.json
```

Hosted deployment is deliberately out of scope; the local path is the full product.

### Using Gemini + Groq (two real models)

Copy `.env.example` to the gitignored `.env.local`, then paste keys after
`GEMINI_API_KEY=` and `GROQ_API_KEY=`. The shipped defaults are
`GEMINI_MODEL=gemini-flash-lite-latest` and `GROQ_MODEL=qwen/qwen3.8-27b`;
change the `*_MODEL` lines only to pin a different free model.
`LLM_PROVIDER=gemini` makes Gemini the app default. With no `.env.local` at all,
the offline mock is the safe default and no command asks for a credential.

The requested `gemini-4-hydrogen` model was probed but its free tier allows only
20 requests/day; this gate needs 10 repetitions × 4 agent calls = 40 calls, so
the working `gemini-flash-lite-latest` model is pinned instead. The exact quota
error is preserved in `docs/eval-live.md`. Keys are read server-side and never
reach the browser. Notes are redacted before
egress, the verdict is still computed locally, and a 429 or quota error falls
back to the deterministic template with the reason recorded in the audit log.

Verify with `npm run demo:rehearse` (adds both real providers automatically once
their keys are present) and `npm run eval:live` (records every repetition and
failure in `docs/eval-live.md`; it will not claim the two-model gate with only one
key). OpenRouter remains supported as an optional provider but is not required.

## What is implemented

Roster CSV import (redacted at the boundary, idempotent), claim formalisation
with mandatory human confirmation, the coverage heatmap, the claim ledger, the
blocking resolution drawer with a substantive falsifier, the provider-swap
recompute proof, the recruiting brief, the audit log, and the print-CSS evidence
statement. The export checkpoint is enforced in four places: service, HTTP 422
route, DB trigger, and an unverified-draft watermark on the statement page.

## Status

**Engine fixture gate passed.** The pure `engine/` and all four hand-computed fixtures are
implemented. The separate two-model live gate is recorded in `docs/eval-live.md`. Every fixture's expected verdict was written by hand from its
`README.md` before the engine was run against it:

| Fixture | Hand-computed | Result |
|---|---|---|
| `clean` | `L6 · 3`, SUPPORTED (theme), IMPRECISE (prevalence) | match |
| `underpowered` | `L2 · 5`, `insufficient`, binding `type` | match |
| `wrong-population` | `L1 · 0`, binding `population` | match |
| `ambiguous` | `L4 · 1`, `[0.21, 1.00]`, binding `support` | match |

`npm run check` runs the secret scan, lint, typecheck, the full unit suite and the engine purity
guard. `npm run build` and `npm run test:e2e` cover the production UI. CI also runs
`npm run eval:gate`, `npm run eval:live` (skips and preserves the recorded report
when no real key is configured), `npm run a11y:lighthouse` and
`npm run demo:rehearse`. The authoritative two-model repetition result is recorded
in [docs/eval-live.md](docs/eval-live.md); it currently records **PASS** with ten
runs each on Gemini and Groq plus the chaos control. The credential-free
`npm ci` path is recorded in [docs/fresh-install.md](docs/fresh-install.md).

## Submission artefacts

- [AI Disclosure Statement](AI_DISCLOSURE.md)
- [Responsible AI](RESPONSIBLE_AI.md)
- [Time-Saved Report](TIME_SAVED_REPORT.md)
- [Human Judgment](HUMAN_JUDGMENT.md)
- [Agent evaluation gate](docs/eval-gate.md), [live repetitions](docs/eval-live.md), [mock/template notes](docs/eval-results.md), [fresh install](docs/fresh-install.md), [Lighthouse a11y](docs/lighthouse-a11y.md) and [20-row measurement](docs/time-saved-measurement.md)
- [Architecture diagram](docs/architecture.svg) (source) and [PNG](docs/architecture.png)
- 3-minute demo video: `docs/demo.mp4`

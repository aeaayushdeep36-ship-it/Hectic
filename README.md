# Hectic

**Know what you actually know.**

Hectic audits the validity of a founder's customer-discovery evidence — who was in the room, how many, in which cells — and refuses to issue an investor-grade evidence statement until the founder resolves every claim the sample cannot carry.

Built for the **AI Agents for Founders Challenge — HETIC 2026**.

> Independent student project. Not affiliated with, endorsed by, or produced by HETIC.

---

## The problem in one paragraph

58% of founders validate by "asking people I know." Only 23% use structured methods with their actual market. The average cost of the resulting rework is $4,200 and 3.2 months. Every discovery tool on the market audits the *transcript* — did you ask a leading question, did they compliment you. None of them audit the *sample* — was this the right person, and are there enough of them. That is the question that decides whether the interview was worth doing, and it is the first question an investor asks.

## The mechanism

```
beliefs  ×  roster  →  evidence type (L1–L6) × independent-organisation support
                   →  structured verdict  →  blocking checkpoint  →  evidence statement
```

Deterministic arithmetic. The model never produces a level, a count, or a verdict.

The verdict has three parts — evidence type, support, and precision — and is never collapsed into a single score. A payment outranks fifty interviews no matter how those interviews are counted; twelve interviews are enough to hear the themes and not enough to claim a market rate. The literature audit that forced this design is in [`research/03-engine-findings.md`](research/03-engine-findings.md).

## Stack

Node 22 · Next.js (App Router) · TypeScript strict · Tailwind · SQLite via better-sqlite3 + Drizzle · Zod · Papa Parse (CSV) · Vitest + fast-check + Playwright + axe-core · ESLint.

LLM runtimes, all free-tier or open-weight: Gemini Flash-Lite · Groq · Ollama `qwen2.5:7b` · in-repo mock provider.

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

Background research is in [`research/`](research/): the competitive analysis that killed three earlier directions, and the falsification of the engine model that was here before this one.

## Run it

```bash
npm ci
npm test
npm run audit -- --roster fixtures/underpowered/roster.csv --claims fixtures/underpowered/claims.json
```

The app itself is `npm run dev`. Hosted deployment is deliberately out of scope;
the local path is the full product.

## Status

**Day-3 gate passed.** The pure `engine/` and all four hand-computed fixtures are
implemented. Every fixture's expected verdict was written by hand from its
`README.md` before the engine was run against it:

| Fixture | Hand-computed | Result |
|---|---|---|
| `clean` | `L6 · 3`, SUPPORTED (theme), IMPRECISE (prevalence) | match |
| `underpowered` | `L2 · 5`, `insufficient`, binding `type` | match |
| `wrong-population` | `L1 · 0`, binding `population` | match |
| `ambiguous` | `L4 · 1`, `[0.21, 1.00]`, binding `support` | match |

`npm run check` runs lint, typecheck, 15 tests, and the engine purity guard.
`npm run build` produces a clean static Next.js build. The interface, database,
agents and checkpoint are the next phase.

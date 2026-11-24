# 00 — Implementation Plan

3 build weeks, 4 hardening days, submission 18 Dec 2026 17:00 CET.
Assumes a team of 2–4. Roles are described by function, not headcount.

---

## The one rule

**Vertical slice by day 5.** A working `roster.csv + claims.json → verdicts on screen` beats a beautiful empty app. If day 5 arrives and there is no end-to-end path, cut scope, not the path.

---

## Go / no-go gate — end of day 3

This is the decision that protects the whole project.

Build the engine first, with no UI and no model. Hand-author four rosters, hand-compute the expected verdict **before** running the engine, then run it.

A verdict is a triple: `level · support · binding`, plus precision where the claim type requires it.

| Fixture | Shape | Hand-computed expected |
|---|---|---|
| `clean` | 22 interviews from 18 orgs, 3 segments, 3 prepayments from 3 orgs, 3 channels | `L6 · 3`, interval `[0.44, 1.00]`. `SUPPORTED` for a theme claim; `IMPRECISE` for a prevalence claim at ±10pp. Binding `null`. |
| `underpowered` | 11 interviews from 5 orgs, one segment, 0 economic buyers, 9 via founder's network | `L2 · 5`, saturation `insufficient`. Binding `type`. `DOWNGRADE` from a claimed L4. |
| `wrong-population` | 14 interviews, all end users, claim is about budget holders | `L1 · 0`. Binding `population`. `WRONG_POPULATION`. |
| `ambiguous` | 12 interviews from 12 orgs (L2) + 1 LOI from a budget holder who is also a friend (L4) | `L4 · 1`, interval `[0.21, 1.00]`. Binding `support`. `DOWNGRADE` from a claimed L5. |

`ambiguous` is the gate. A scoring model averages it into something comfortable and wrong. The correct answer is uncomfortable and exact: *one organisation has committed, and the twelve interviews do not lend it weight because they are a different kind of evidence.*

**Pass condition:** all four match the hand computation exactly. A disagreement means the model is wrong, not the fixture — fix the model or fail the gate. "It depends" in the expected-output file is a fail.

**Fail action:** if this gate fails after two days of iteration, switch to Idea 2 (One Truth coherence) from `research/02-ideas.md`. Do not push through.

The model this gate tests was itself falsified once and rebuilt; the audit is `research/03-engine-findings.md`. Do not re-litigate it — re-run `research/model_final.py` if a threshold is challenged.

---

## Week 1 — engine and spine

| Day | Work | Done when |
|---|---|---|
| 1 | Scaffold: Next.js + TS strict + Tailwind + Drizzle + SQLite. CI runs lint + typecheck + test. | `npm run dev` serves a page; `npm test` is green on a placeholder |
| 1 | Domain types + Zod schemas for `Claim`, `Evidence`, `Requirement`, `Finding`, `Resolution` | Schemas compile, no `any` |
| 2 | `engine/thresholds.ts` — evidence levels, saturation rungs, precision table, citations as data | Table unit-tested against source values; every threshold carries its `kind` |
| 2 | `engine/coverage.ts` — matrix build, per-cell counts, organisation-level independence, network-chain diagnostic | Pure functions, 100% branch coverage |
| 3 | `engine/verdict.ts` — level, support, breadth, saturation, Wilson interval, binding-constraint selection | **Go/no-go fixtures match by hand** |
| 4 | CSV ingestion + normalisation (roles, channels, relationships, dates) | Messy real CSV parses; bad rows reported not crashed |
| 4 | `engine/explain.ts` — human-readable blocker text, no model | Every blocker renders a sentence |
| 5 | CLI: `npm run audit -- --roster x.csv --claims y.json`; end-to-end on `underpowered` | Verdicts printed, **vertical slice achieved** |

**Week 1 non-goals:** no LLM, no database writes beyond seed, no styling beyond functional.

---

## Week 2 — interface and the gate

| Day | Work | Done when |
|---|---|---|
| 6 | DB schema + migrations + seed three demo workspaces | `npm run db:reset` produces three browsable workspaces |
| 6 | App shell, workspace switcher, empty states | Navigable, keyboard-accessible |
| 7 | Coverage heatmap with empty-cell treatment and threshold tooltips | The empty row is legible from 3 metres |
| 7 | Claim ledger: claimed vs verified level, blocker list | Reads in under 10 seconds |
| 8 | Claim formalisation agent + confirmation UI | Founder edits population, confirms; stored with timestamp |
| 9 | Checkpoint: resolution drawer, falsifier input, server-side 422 | `curl` to export with unresolved claims returns 422 |
| 10 | Evidence Statement export (print-CSS HTML → PDF) | One page, opens clean in Acrobat, no headless-Chrome dependency |
| 10 | Model-swap recompute button + audit log view | Numbers provably identical across providers |

**Week 2 non-goals:** no auth, no multi-user, no sharing, no integrations.

---

## Week 3 — proof and polish

| Day | Work | Done when |
|---|---|---|
| 11 | Relevance tagger agent (batched, cheap model) | 11 interviews = 11 calls, human override works |
| 11 | Ollama fallback path | Full run with `LLM_PROVIDER=ollama`, no network |
| 12 | Model-swap determinism test + injection red-team suite | Both green in CI |
| 12 | Accessibility pass: contrast, focus order, reduced motion, no colour-only encoding | axe clean on the three main views |
| 13 | Recruiting brief generator (the "go get these 6 interviews" output) | Names the cell, the count, and a screening line |
| 13 | Copy pass: tone audit against the design-system rules | No sentence characterises the founder |
| 14 | Demo data finalised; three workspaces rehearsed | One clean take possible |

---

## Hardening — 15 to 17 Dec

| Day | Work |
|---|---|
| 15 | Record the 3-minute video. One take, no cuts, real checkpoint. Re-record twice, keep the third. |
| 15 | Write AI Disclosure Statement, Responsible AI section, Time-Saved Report |
| 16 | README: three commands to run. Test on a clean machine or fresh container. |
| 16 | Architecture diagram (Excalidraw), export PNG + source |
| 17 | Judge dry-run: hand the repo to someone who hasn't seen it. Fix whatever they stumble on. |
| 18 | Submit by 12:00 CET. Twelve hours of buffer, not twelve hours of work. |

---

## Scope lock — what is not being built

Write this on the wall. Every item below has been considered and rejected for a reason.

| Cut | Reason |
|---|---|
| Transcript upload / parsing | FounderGate owns that surface. Roster-only is the differentiator, not a limitation. |
| Auth, accounts, teams | Judges test one workspace in three minutes. |
| Real-time collaboration | Zero rubric value. |
| CRM / Notion / Airtable integrations | Setup friction kills the "judge can run it" requirement. |
| LLM-generated verdicts or scores | Destroys the reliability claim. Non-negotiable. |
| Mobile layout | Demo is desktop; responsive down to tablet is enough. |
| Payments, billing, pricing page | Not a product launch. |
| Vector DB / RAG | No corpus to retrieve from. Would be cargo cult. |

---

## Ownership (adapt to team size)

| Track | Owns | Depends on |
|---|---|---|
| **Engine** | `engine/*`, fixtures, thresholds, citations | nothing |
| **Interface** | App Router pages, components, heatmap, checkpoint UX | engine types |
| **Agents** | provider adapter, four LLM steps, prompts, redaction | engine types |
| **Delivery** | CI, migrations, export, docs, video, submission | everything |

With two people: one takes engine + agents, the other takes interface + delivery. The engine owner is the critical path for week 1; the interface owner builds against Zod-inferred types from day 1 using fixtures, and is never blocked.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Verdicts feel arbitrary / arguable | Low | Fatal — kills the demo | Every number that can move a verdict is either cited (Pattyn 2026, Guest 2006, Hennink 2017, Wilson & Lilien 1992) or computed (Wilson interval). Unsourced heuristics were removed from the verdict path entirely. |
| Judge attacks the literature: "Pattyn is n=16 and exploratory" | Medium | Medium | Concede it in the docs first: the claim is "the strongest published ordering", not "proven". `research/03-engine-findings.md` §5 lists the four limits unprompted. |
| Demo reads as accusatory | Medium | High — judges dislike the tone | Copy rules in design system; agent reports coverage, never characterises the founder |
| LLM latency in the live demo | Medium | High | Pre-warm, stream, and have the deterministic-only path as fallback (`--no-llm` flag) |
| Free-tier rate limit during judging | Medium | High | 20 calls/run vs 500 RPD; Ollama fallback; cache by input hash |
| Scope creep into transcripts | High | High | Scope lock table above |
| Team runs out of time for docs | High | 10% of score lost | Docs written 15–17 Dec are templates already drafted in this folder; fill, don't author |

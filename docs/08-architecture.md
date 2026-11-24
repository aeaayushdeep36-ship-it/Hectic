# 08 — Architecture

The shape of the system, and the one constraint that determines all of it.

---

## 1. The governing constraint

> **No language model may produce a number, a count, a score, or a verdict.**

Everything else follows from this. It is not a stylistic preference — it is the product's central claim, the reliability answer, and the frugality answer in one line.

It is enforced structurally, not by discipline:

- The verdict type has no field a model could write into.
- Model output is parsed into a Zod schema that contains only `population`, `predicate`, `kind`, `claim_type`, `rationale`, and `citations` — never `level`, `support`, `count`, `binding`, or `verdict`.
- There is a test that swaps the provider and asserts a byte-identical finding set. If someone later adds a model call inside the engine, that test fails.

---

## 2. System shape

One process. One language. One database file.

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (App Router, TypeScript, Node runtime)             │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐   │
│  │  UI (RSC)    │   │ Route        │   │ Server         │   │
│  │  + client    │──▶│ Handlers     │──▶│ Actions        │   │
│  └──────────────┘   └──────┬───────┘   └───────┬────────┘   │
│                            │                   │            │
│                     ┌──────▼───────────────────▼──────┐     │
│                     │        Orchestrator             │     │
│                     │  run.ts · state machine · audit │     │
│                     └──────┬───────────────────┬──────┘     │
│                            │                   │            │
│              ┌─────────────▼──────┐   ┌────────▼─────────┐  │
│              │  Deterministic     │   │  Agent layer     │  │
│              │  engine/           │   │  agents/         │  │
│              │  thresholds        │   │  claim-formaliser│  │
│              │  coverage          │   │  relevance-tagger│  │
│              │  verdict           │   │  constraint-explain│ │
│              │  precision         │   │  statement-compose│ │
│              │  explain           │   │  ── I/O only ──  │  │
│              │  ── no I/O ──      │   │                  │  │
│              └────────────────────┘   └────────┬─────────┘  │
│                                                │            │
│                                       ┌────────▼─────────┐  │
│                                       │ Provider adapter │  │
│                                       │ gemini·groq·ollama│ │
│                                       │ ·mock            │  │
│                                       └──────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ SQLite (better-sqlite3) · Drizzle · evidence + audit  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Why one process:** the README must be three commands. A Python sidecar doubles the install surface and forks the type definitions. The engine is pure arithmetic — TypeScript is entirely adequate for it, and sharing types with the UI removes a whole class of integration bugs.

**Why SQLite:** the audit trail is the product. Runs, model calls, overrides, and resolutions need to be queryable and durable. A file-based DB gives that with zero operational burden, and the DB file can be shipped with the repo as a seeded demo.

---

## 3. Module boundaries

| Path | Contains | May import | May **not** import |
|---|---|---|---|
| `engine/` | Pure functions. Thresholds, coverage, verdict, precision, explain. | `lib/types`, `lib/schemas` | React, Drizzle, any provider, `fs`, `fetch` |
| `agents/` | One file per LLM step. Prompt + parse + validate. | `lib/schemas`, provider adapter | `engine/verdict`, DB |
| `providers/` | Adapter interface and four implementations | `fetch` | anything app-specific |
| `server/` | Orchestrator, persistence, export | everything | React |
| `app/` | Routes and components | `server/`, `lib/` | `engine/` directly (always via server) |
| `lib/` | Types, Zod schemas, formatting | nothing | everything |

The `engine/` row is the important one. It has **no I/O of any kind**. That is what makes it testable in microseconds, portable, and auditable by a judge in sixty seconds.

Enforce with an ESLint `no-restricted-imports` rule per directory, and a test that greps `engine/**` for `fetch|fs|drizzle|react`.

---

## 4. Data flow

### 4.1 One run, end to end

```
1. IMPORT       CSV → normalise → validate → evidence rows
2. FORMALISE    claim text → agent → proposal → HUMAN CONFIRMS → claim rows
3. PREPARE      claim + claim_type → applicable thresholds (cited, with kind)
4. TAG          evidence.notes → agent → (evidence, claim, polarity) — batched, cached
5. COVER        tagged evidence → independent orgs by type, population, chain diagnostic
6. VERDICT      coverage facts → level + support + breadth + saturation + interval + binding
                                                                  [deterministic]
7. EXPLAIN      verdict → sentence                                [agent, cosmetic only]
8. GATE         any non-SUPPORTED unresolved? → 422, stop
9. COMPOSE      locked ledger → statement narrative               [agent, cosmetic only]
10. EXPORT      statement → print HTML → PDF
```

Steps 5 and 6 are the product; step 3 is its evidence base. Steps 2, 4, 7, 9 are language plumbing. Steps 1, 8, 10 are ordinary software.

Note the asymmetry: an agent can fail, time out, or return garbage at steps 7 and 9 and **the verdict is unaffected** — because it was already computed at step 6 and stored. Agents degrade the prose, never the finding.

### 4.2 Caching and idempotency

Every run stores `input_hash = sha256(canonical(claims) + canonical(evidence) + engine_version + threshold_version)`.

- Same input hash → same findings. A re-run is served from cache.
- Agent calls cache by `(agent, model, prompt_hash)`. Re-running with an unchanged roster costs zero calls.
- Changing any input produces a new run, versioned. Old runs are never mutated — the audit trail is append-only.

---

## 5. State machine

```
                    ┌──────────┐
                    │  DRAFT   │  roster and claims being entered
                    └────┬─────┘
                         │ claims confirmed
                    ┌────▼──────────┐
                    │  ANALYSED     │  findings computed and stored
                    └────┬──────────┘
                         │
              ┌──────────┴───────────┐
   all findings SUPPORTED     any finding non-SUPPORTED
              │                      │
              │               ┌──────▼───────┐
              │               │   BLOCKED    │──── resolution added ──┐
              │               └──────┬───────┘                        │
              │                      │ all resolved                   │
              │               ┌──────▼───────┐                        │
              └──────────────▶│  RESOLVED    │◀───────────────────────┘
                              └──────┬───────┘
                                     │ export
                              ┌──────▼───────┐
                              │  EXPORTED    │  immutable; re-run forks a new version
                              └──────────────┘
```

`BLOCKED → EXPORTED` must be impossible. Enforced in three places: the orchestrator refuses, the route handler returns 422, and the DB has a `CHECK` constraint on the export record referencing a resolved run.

---

## 6. The export path

No headless browser. No Puppeteer. Export is a server-rendered HTML document with a print stylesheet, served at `/w/[slug]/statement` with `@media print` rules. The user prints to PDF.

Reasons: removes a 300MB dependency, removes a class of font-rendering bugs, works on any judge's machine, and keeps the artefact inspectable — a judge can view source and see every number was server-rendered, not drawn by JS.

---

## 7. Provider abstraction

```ts
interface Provider {
  readonly id: "gemini" | "groq" | "ollama" | "mock";
  readonly model: string;
  complete(req: {
    system: string;
    user: string;
    schema: z.ZodTypeAny;
    maxTokens: number;
    temperature: 0;          // non-negotiable
  }): Promise<{ data: unknown; usage: Usage }>;
}
```

Rules:

- `temperature: 0` everywhere. Non-negotiable, asserted in the adapter.
- Structured output only. Each provider's native JSON mode; fallback to extract-JSON-and-validate.
- One repair attempt on schema failure, then a typed `AgentError`. No silent retries beyond that.
- `mock` returns fixtures and is the default in CI — tests never hit a network.
- `ollama` is the offline demo path. If the network dies during judging, the app still runs.

---

## 8. Frugality budget

| Step | Calls | Model class |
|---|---|---|
| Claim formalisation | 1 per claim (≤6) | small |
| Relevance tagging | 1 per evidence row (≤20), batched 5 at a time | smallest |
| Constraint explanation | 1 per non-SUPPORTED claim (≤4) | small |
| Statement composition | 1 | small |
| **Total** | **≤ 32, typically 20** | |

Against Gemini 3.5 Flash-Lite free tier (500 RPD), that is ~25 full runs per day. Caching means a rehearsal costs nothing after the first run.

Displayed in the UI as a live counter: `Run cost: €0.00 · 18 calls · 4,210 tokens`.

---

## 9. Failure behaviour

| Failure | Behaviour |
|---|---|
| Provider unreachable | Verdict still renders from stored findings; explanation falls back to deterministic template; banner shows "prose degraded" |
| Schema violation after repair | `AgentError` with the raw response attached; the affected claim falls back to the deterministic explanation |
| CSV has invalid rows | Import partial-succeeds with an error report; valid rows are usable |
| Threshold override invalid | Rejected at the Zod boundary with the allowed range |
| Export attempted while blocked | 422 + unresolved list |
| DB write fails mid-run | Transaction rolls back; run marked `FAILED`; no partial findings are visible |

The principle: **the finding is never lost to a prose failure.** Degrade the language, keep the arithmetic.

---

## 10. Deployment

- Local: `npm i && npm run db:reset && npm run dev`
- Optional Docker: single stage, Node 22 alpine, volume for the SQLite file.
- Hosted demo (if used): Vercel for the app, but SQLite requires a persistent volume — so the hosted demo uses a pre-seeded read-only DB and disables writes. The full experience is local. State this plainly in the README rather than pretending otherwise.

---

## 11. Architecture diagram (submission artifact)

Excalidraw, exported to PNG at 2x. Must show, in this order top-to-bottom:

1. Inputs: roster CSV, claim text
2. Agent layer with the four steps, visually distinct (dashed) from the engine
3. **The boundary line** — labelled *"no numbers cross this line"*
4. Deterministic engine
5. The blocking gate with 422
6. Export

The boundary line is the point of the diagram. Draw it prominently.

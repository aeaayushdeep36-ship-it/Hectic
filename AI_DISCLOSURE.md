# AI Disclosure Statement

Hectic uses language models for three language tasks and refuses to use them for
the one task that matters. Full detail, including failure modes, model→agent
mapping and known limits, is in [RESPONSIBLE_AI.md](RESPONSIBLE_AI.md).

- **Runtime models (free-tier / open-weight only):** Gemini 2.0 Flash-Lite,
  Groq `llama-3.1-8b-instant`, Ollama `qwen2.5:7b`, plus an in-repo deterministic
  mock. No paid model, no secret in the repository.
- **Used for:** claim formalisation, relevance tagging, prose around computed
  findings, and statement composition.

### Model → agent map

| Agent | Versioned prompt | Default model | Free-tier / open-weight provider | Role | Fallback when the model fails |
|---|---|---|---|---|---|
| A1 `claim-formaliser` | `claim-formaliser.v1` | `mock-v1` | Gemini 2.0 Flash-Lite · Groq `llama-3.1-8b-instant` · Ollama `qwen2.5:7b` | Propose population, predicate, kind, claim type and ambiguity flags from one sentence | `templateProposal()` — narrow role noun or an explicit `UNSPECIFIED` placeholder, always flagged |
| A2 `relevance-tagger` | inline schema prompt in `agents/relevance.ts` | `mock-v1` | Same three runtimes | Tag redacted notes as bearing / not bearing on one claim, in **one batch per claim** | `templateTag()` per row — requires two distinct predicate terms; silence is not evidence |
| A3 `constraint-explainer` | inline numeric-guard prompt in `agents/explainer.ts` | `mock-v1` | Same three runtimes | Rephrase an already-computed verdict in two sentences | Deterministic `explain()` text; any new digit is rejected |
| A4 `statement-composer` | none — no model call | n/a | n/a | Describe the locked ledger in four sections | It is the fallback: pure string composition over stored findings |
| G1 `input-guard` | none — regex | n/a | n/a | Redact email, phone, IBAN, URL, formulas and likely person names; flag injection | Not applicable — deterministic |

Note: A4 previously used a model call; it is now pure composition, so no model
can touch the statement's numbers. The mock is the default provider for A1–A3 and
routes to schema-valid golden outputs offline.

- **Never used for:** levels, counts, scores, thresholds, binding constraints or
  verdicts. The engine is pure arithmetic in `engine/` and is structurally
  isolated from every provider.
- **Human oversight:** every formalised field must be confirmed; every relevance
  tag is visible and overridable; every non-supported claim needs a typed
  resolution and a falsifier naming a measurable condition before export.
- **Affected parties:** the founder's interviewees. Local-only processing,
  aliases, redaction before egress, no telemetry, no names in the export.
- **Development:** code, docs and copy were AI-assisted and reviewed against the
  specifications in `docs/`. Citations were fetched and checked, not assumed.

Hectic is an independent student project submitted to the AI Agents for Founders
Challenge. It is not affiliated with, endorsed by, or produced by HETIC.

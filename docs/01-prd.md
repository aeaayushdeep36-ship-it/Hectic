# 01 — Product Requirements Document

**Product:** Hectic
**Tagline:** Know what you actually know.
**Version:** 1.0 (hackathon scope)
**Owner:** Product
**Status:** Approved for build

---

## 1. Problem

A founder finishes a round of customer discovery and reaches a conclusion: *"The market wants this, and they'll pay €200 a month."*

That conclusion rests on a sample. Nobody — not the founder, not their accelerator, not their investor — ever inspects the sample. They inspect the output: the quotes, the summary slide, the confident sentence.

The sample is where the error lives:

- **58%** of founders validate by asking people they know. Only **23%** use structured methods with their actual target market. (SegmentOS, 500 founders, Q1 2026)
- A widely repeated "average rework cost" figure ($4,200 / 3.2 months) was **removed** from this document because no primary source could be traced. It is not used anywhere in the product, the README, or the Time-Saved Report.
- **72%** of new products fail within 18 months of launch.
- Single-informant buying-centre research is structurally unreliable: across 104 buying-centre decisions, multi-informant models significantly outperformed single-informant ones. One informant per account is "the cheapest way to be confidently wrong." (Wilson & Lilien, 1992)
- Published saturation guidance is specific and ignored: ~12 interviews within a homogeneous segment (Guest, Bunce & Johnson, 2006); core range 9–17 (Hennink & Kaiser, 2022); 20–50 while still discovering who the customer is; 15–25 per segment when comparing segments.

Existing tooling attacks the wrong object:

| Tool | Audits |
|---|---|
| FounderGate | Whether the founder asked leading questions |
| Unpitched | Talk-time ratio |
| CoLoop | Live leading-question flags |
| CiteJury / Rathvane | Whether public claims match public sources |
| askOdin Crucible | Whether the deck matches the financial model |

None of them audit **who was in the room**. That is the variable that determines whether the interview had any information value at all.

---

## 2. Users

### Primary — the pre-seed / seed founder, 1–4 weeks from a raise
Has done 8–20 discovery interviews. Believes the idea is validated. Is about to put a "Customer Discovery" slide in a deck and defend it to an investor who opens with *"who did you talk to?"* Has no research training and no budget for a research agency.

**Job to be done:** *Before I present this as evidence, tell me whether it actually is evidence — and if not, what is the smallest thing I could do to make it one.*

**Success looks like:** the founder discovers a gap in their own sample that they can still fix, rather than discovering it in a partner meeting.

### Secondary — the accelerator coach / university venture mentor
Sees 20–40 teams a term. Needs a fast, non-judgemental way to show a team why their "validation" isn't yet validation, without doing the analysis by hand.

**Job to be done:** *Give me an artefact I can put in front of a team that shows the gap without me having to be the one who says it.*

### Explicit non-user
Growth-stage teams with existing research operations. They have researchers. Hectic is for people who have never had one.

---

## 3. The core object model

The product has exactly three nouns. Everything else is derived.

### 3.1 Claim — a belief the founder holds

A claim is a testable proposition, decomposed into:

| Field | Meaning | Example |
|---|---|---|
| `raw_text` | What the founder wrote | "Dental practice managers will pay €200/month" |
| `population` | Who must be in the sample for this to be testable | "Practice managers at 5–20 person dental clinics in France" |
| `predicate` | What must be observed | "Agrees to a recurring €200/month commitment" |
| `kind` | Claim family; drives requirement derivation | `willingness_to_pay` |
| `claim_type` | Which mathematics applies: thematic or prevalence | `prevalence` |
| `claimed_level` | How strongly the founder asserts it, L1–L6 | `L4` |

`kind` ∈ `pain` · `frequency` · `willingness_to_pay` · `role_ownership` · `displacement` · `retention` · `comparative`

`claim_type` ∈ `theme` · `prevalence` — set by the founder at confirmation, because it changes what counts as adequate evidence (§4.3).

### 3.2 Evidence — one interview

| Field | Required | Notes |
|---|---|---|
| `alias` | yes | No real names required. Pseudonyms preferred. |
| `interviewed_at` | yes | Recency is a validity input |
| `role` | yes | Free text, normalised |
| `budget_authority` | yes | `economic` · `technical` · `user` · `influencer` · `none` |
| `segment` | yes | Drives matrix rows |
| `org_name` | yes | Used for independence counting, never displayed in full |
| `org_size` | no | |
| `source_channel` | yes | `network` · `linkedin` · `community` · `panel` · `event` · `inbound` · `other` |
| `relationship` | yes | `stranger` · `acquaintance` · `friend` · `family` · `colleague` |
| `duration_min` | no | <10 min is flagged as thin |
| `notes` | no | Free text; feeds relevance tagging only |

### 3.3 Resolution — the human judgement

For every claim that does not support its claimed level, the founder must choose exactly one action and write one falsifier:

| Action | Meaning |
|---|---|
| `downgrade` | Restate the claim at the level the evidence supports |
| `fund_gap` | Commit to N more interviews in a named cell before using the claim |
| `accept_limitation` | Use the claim, with a written limitation stated wherever it appears |

`falsifier` is free text, minimum 40 characters, and must name an observable event. It is not generated, suggested, or autocompleted by the model. This is deliberate: it is the one input the system cannot compute.

---

## 4. The evidence model

Hectic does not output "valid", "invalid", or a score. It outputs a **structured verdict** with three parts, read together:

```
L4 · 3 orgs · interval [0.44, 1.00]
```

- **Level** — what kind of evidence you have. Sets the ceiling.
- **Support** — how many independent organisations stand behind it. Sets the weight.
- **Precision** — what the claim actually carries, computed. Sets the wording.

The model is a deliberate reversal of v1.0, which used a single L0–L3 ladder. That ladder failed 6 of 7 published ordering constraints and labelled four prepayments "no evidence". The audit is in `research/03-engine-findings.md`. The short version: a four-rung scale cannot represent a six-level evidence hierarchy, and no amount of threshold tuning fixes an exhausted scale.

### 4.1 Levels — evidence type

The ordering is Pattyn, Dillen & Goetz (2026), *Computers* 15(8):535, verified against the full text. The rationale is theirs: each level requires progressively greater external commitment, reputational exposure, or financial risk from someone outside the company.

| Level | Type | What it licenses the founder to say |
|---|---|---|
| L1 | `internal` | "We believe…" |
| L2 | `stated` | "N people in this segment told us…" |
| L3 | `concept` | "We put the concept in front of N people and…" |
| L4 | `commitment` | "N organisations committed: pilot, LOI, waitlist, signup." |
| L5 | `investment` | "An investor committed contingent on…" |
| L6 | `payment` | "N organisations have paid us." |

**L1 is a floor, not a finding.** Every founder holds an own-itch hypothesis, so the engine never tells someone who has done real work that they have no evidence. The ladder's worst failure was doing exactly that.

**Quantity never raises the level.** Pattyn's central finding is that the number of validation events does not track startup performance. Fifty interviews stay at L2. Accumulation is not escalation.

**L5 does not validate a customer claim.** Investor commitment is a different stakeholder and may reflect belief in the founder, the network, or the market rather than the value proposition. From L4 the next customer-relevant target is L6.

### 4.2 Support — who was in the room

| Field | Definition |
|---|---|
| `support` | Independent in-population organisations at the verdict level |
| `breadth` | Independent in-population organisations at any level |

**The counting unit is the organisation, not the interview** (Wilson & Lilien, 1992). Eleven interviews drawn from five organisations is five units of evidence. Multiple informants inside one organisation are not independent observations of that organisation.

Level and support are never collapsed into one number. The same level with different support is a different claim:

| Evidence | Verdict | Reading |
|---|---|---|
| 4 prepayments from 4 orgs approached | L6 · 4 · [0.51, 1.00] | Everyone approached paid |
| 4 prepayments from 39 orgs approached | L6 · 4 · [0.04, 0.24] | One in ten approached paid |

Both are L6. They are not the same business. The old ladder scored these L0 and L3 respectively — not merely coarser, but inverted.

### 4.3 Precision — two claims, two mathematics

`claim_type` decides which statistics apply, because the same sample can support one claim and not the other.

**`theme`** — "buyers struggle with X". Thematic completeness applies:

| Breadth | Rung | Basis |
|---|---|---|
| < 6 | `insufficient` | Below Guest's basic-metatheme point |
| 6–11 | `basic` | Basic elements present at 6 (Guest, Bunce & Johnson 2006) |
| 12–23 | `code` | ~88% of themes by 12 (Guest 2006; Hennink 9–17) |
| ≥ 24 | `meaning` | Meaning saturation 16–24 (Hennink & Kaiser 2017) |

**`prevalence`** — "most buyers would pay". Saturation is irrelevant here; this needs an interval. The engine computes a 95% Wilson score interval deterministically:

| n | Half-width at p = 0.5 |
|---|---|
| 12 | ±0.25 |
| 39 | ±0.15 |
| 93 | ±0.10 |
| 381 | ±0.05 |

Twelve interviews — the number the whole industry quotes — buys ±25 percentage points. That is enough to know you have heard the themes. It is not enough to say most of a market will pay.

The interval assumes random sampling. Founders recruit by convenience, so it is a **best case**: true uncertainty is wider. The UI must say so wherever the interval appears.

### 4.4 Findings

| Finding | Condition |
|---|---|
| `SUPPORTED` | `level ≥ claimed_level` and the precision requirement is met |
| `DOWNGRADE` | `level < claimed_level` |
| `IMPRECISE` | Level reached, but the interval is wider than the claim tolerates (prevalence only) |
| `WRONG_POPULATION` | Evidence exists, but none of it is in the claim's population |
| `UNTOUCHED` | No external evidence at all — L1 floor only |

Every non-`SUPPORTED` finding carries a **binding constraint**: the single change that would raise the verdict. Verified mechanically — in all 14 test cases, performing the named change raises it.

| Binding | Meaning | Fix |
|---|---|---|
| `population` | Nothing you have is about this claim | Re-target the next conversations |
| `type` | Population is fine; evidence type caps you | Get the next evidence type up |
| `support` | Type reached, but rests on 1–2 organisations | Repeat it on more organisations |
| `null` | Nothing this week moves it | — |

> *"You have 11 interviews and 0 budget holders. Eleven more interviews will not move this claim — it is capped by evidence type at L2. Two practice managers who will sign a paid pilot is the only change that unlocks L4. Nothing else you can do this week raises it."*

### 4.5 Threshold honesty

Every threshold is data, not code. It carries its kind, because the three kinds are not interchangeable:

```ts
{
  code: "SATURATION_CODE",
  kind: "saturation",        // level | support | saturation | precision
  value: 12,
  rationale: "88% of themes and 97% of important themes developed by 12 interviews; code saturation range 9-17.",
  source: "Guest, Bunce & Johnson (2006); Hennink & Kaiser (2017)",
  scope: "theme claims only",
  overridable: true
}
```

Founders may override a threshold. The override is logged with a timestamp and appears in the export as a footnote. Arguing with the instrument is allowed; hiding the argument is not.

**Two thresholds are deliberately not in the verdict path.** Network share (60/50/30%) and distinct-channel minimums were heuristics with no direct source, and the old L1 channel rule is what nullified four prepayments. They survive as **reported diagnostics** — "9 of your 11 organisations came through one introduction chain" — never as scored gates. Every number that can change a verdict now traces to a citation or a formula.

---

## 5. Scope

### In scope

- Roster CSV import with validation and row-level error reporting
- Claims entry (free text) and model-assisted formalisation with mandatory human confirmation
- Deterministic coverage matrix and verdict engine
- Blocking checkpoint with three actions and a typed falsifier
- Discovery Evidence Statement export (print-CSS HTML → PDF)
- Recruiting brief for the binding constraint
- Three seeded demo workspaces
- Local-only operation; no account required

### Out of scope (v1)

Transcript upload · auth · teams · integrations · mobile layout · billing · RAG · shareable public links · live collaboration · non-English UI.

Rationale for each cut is in `00-implementation-plan.md`.

---

## 6. User stories & acceptance criteria

### US-1 — Import a roster
*As a founder, I want to drop in my interview list so Hectic can see who I spoke to.*

**Accept when:**
- A CSV with the documented headers imports in <2s for 200 rows.
- Each invalid row produces a specific message naming the row, the column, and the accepted values.
- Unknown enum values are surfaced for correction, never silently coerced.
- Import is idempotent: re-importing the same file does not duplicate rows.

### US-2 — Formalise a claim
*As a founder, I want my sentence turned into something testable, but I want to correct it.*

**Accept when:**
- The model returns `population`, `predicate`, `kind`, `claim_type`, and a per-field ambiguity flag.
- The model returns **no level, no count, and no score**. It proposes meaning; the founder asserts strength.
- The confirmation screen pre-fills all fields as editable and highlights any field the model flagged as ambiguous.
- `claimed_level` is chosen by the founder from the L1–L6 ladder, never suggested or defaulted.
- Nothing proceeds until the founder presses Confirm; the confirmation timestamp and the diff from the model's proposal are stored.
- A claim with no population cannot be confirmed.

### US-3 — See coverage
*As a founder, I want to see the shape of my sample at a glance.*

**Accept when:**
- The matrix renders segment (rows) × budget authority (columns) with counts.
- Zero-count cells are visually distinct **without relying on colour alone** (pattern + label, per WCAG 1.4.1).
- Hovering or focusing a cell shows the contributing interviews.
- The matrix is readable at 1280px with 6 segments and 5 columns without horizontal scroll.

### US-4 — Understand a finding
*As a founder, I want to know why my claim was downgraded, in one sentence.*

**Accept when:**
- Each finding states: claimed level, verified level, support count, and the single binding constraint.
- The copy contains no evaluative language about the founder (see design-system tone rules).
- Every threshold cited links to its rationale and source, including its `kind`.

### US-5 — Resolve a gap
*As a founder, I want to decide what to do, not have it decided for me.*

**Accept when:**
- The export endpoint returns **HTTP 422** with `{ unresolved: [claimId…] }` while any non-`SUPPORTED` claim lacks a resolution.
- The UI disables export for the same condition — but the server check is authoritative.
- `falsifier` under 40 characters is rejected client- and server-side.
- Resolutions are immutable once exported; a re-run creates a new version.

### US-6 — Export
*As a founder, I want a one-page document I can put in a data room.*

**Accept when:**
- Output is a single A4 page (2 max) containing: claim ledger, coverage matrix, resolutions, falsifiers, and stated limitations.
- It prints correctly from a browser with no JS.
- No real names, emails, or phone numbers appear (verified by test).
- Every number in it is reproducible from the stored run.

### US-7 — Prove determinism
*As a judge, I want to check that the model isn't inventing the numbers.*

**Accept when:**
- A `Recompute` control re-runs the pipeline with a different provider.
- The rendered verdicts and counts are identical; a hash of the finding set matches.
- The UI displays both run hashes side by side.

---

## 7. Success metrics

For the submission's Time-Saved Report, measured on the demo workspace and stated as estimates where not measurable:

| Metric | Target | How measured |
|---|---|---|
| Time to produce an investor-grade evidence statement | ≤20 min vs 6–8h manual | Timed on the `underpowered` fixture |
| LLM calls per full run | ≤22 | Instrumented counter |
| Cost per run | €0.00 | Provider pricing × tokens |
| Verdict reproducibility across providers | 100% | Automated test |
| Time from clone to running app | ≤3 commands | Tested on a clean machine |
| Empty-cell comprehension | Understood by a first-time viewer in <10s | 5-person hallway test during week 3 |

---

## 8. Naming

"Hectic" is the product name. It is a deliberate near-homophone of HETIC, the host institution, and that association is intentional and acknowledged.

**Required disclosure** in the submission and README: *"Hectic is an independent student project submitted to the AI Agents for Founders Challenge. It is not affiliated with, endorsed by, or produced by HETIC."*

No HETIC logo, wordmark, or brand asset is used anywhere in the product.

---

## 9. Open questions

| # | Question | Owner | Resolve by |
|---|---|---|---|
| 1 | Does the matrix row key belong to `segment` (free text) or a normalised segment entity? Free text risks 11 spellings of one segment. | Engine | Day 6 |
| 2 | Should `org_name` be hashed at import so independence counting works without storing an identifier? | Security | Day 4 |
| 3 | Is a 40-character falsifier minimum the right friction? Test with 3 people in week 2. | Product | Day 12 |
| 4 | Does the L5 rung belong in the product at all, or should customer claims skip from L4 to L6 in the UI while L5 is shown only for fundraising claims? | Product | Day 3 |

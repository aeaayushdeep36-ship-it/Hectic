# 03 — Does the confidence ladder survive the evidence?

**Status:** resolved against the design in `docs/01-prd.md` v1.0
**Method:** literature verification, then a falsification battery run against
the specified engine and against a candidate replacement.
**Reproduce:** `python research/model_final.py` (all numbers below are its output)

---

## 1. The question

The PRD specified a single ordinal verdict, L0–L3, computed as the maximum
level whose AND-requirements the evidence satisfies:

| Level | Label |
|---|---|
| L0 | `hypothesis` |
| L1 | `early_signal` |
| L2 | `directional` |
| L3 | `confident` |

Two things were unverified: whether four rungs is the right number, and whether
one number is the right shape at all. Both turned out to be wrong. The
thresholds were never the problem.

---

## 2. What the literature actually says

### 2.1 The validation hierarchy has six levels, defined by evidence *type*

Pattyn, Dillen & Goetz (2026), *Computers* 15(8):535, is the closest thing to a
validated pre-MVP evidence hierarchy. Verified from the full text:

| Level | Evidence type |
|---|---|
| L1 | founder-internal / informal interest (own-itch, casual conversation) |
| L2 | structured stated evidence (surveys, discovery interviews) |
| L3 | concept exposure without commitment (prototype, landing page, MVE) |
| L4 | behavioural commitment, non-financial (signup, waitlist, pilot, LOI) |
| L5 | contingent investment commitment |
| L6 | paying customer pre-MVP |

The ordering rationale is stated explicitly: *"each level requires progressively
greater external effort, behavioural commitment, reputational exposure, or
financial risk from an outside party."*

Two findings from that study matter more than the table:

1. **Quantity does not substitute for type.** *"No clear relationship was
   observed between the number of validation events and startup performance."*
   Fifty interviews do not become a commitment by accumulation.
2. **Payment is the strongest pre-MVP signal**, because it is the only one where
   the counterparty puts their own money at risk on the value proposition
   itself, rather than on the founder, the vision, or the network.

The consequence for us is immediate: **the PRD's four rungs cannot represent a
six-level hierarchy.** It is not a rescaling. It merges concept exposure with
behavioural commitment, and it has no representation for investor commitment at
all. Those are distinctions the only directly relevant empirical study treats as
material.

### 2.2 Certainty is assessed on separate components, and reported as the weakest

- **GRADE** rates certainty (high / moderate / low / very low) by starting from
  a study-design baseline and then downgrading across independent domains: risk
  of bias, inconsistency, indirectness, imprecision, publication bias. It
  explicitly does not average these into a score.
- **GRADE-CERQual** does the same for qualitative evidence, across four
  components: methodological limitations, coherence, **adequacy**, and
  **relevance**. Adequacy is about the richness of the data; relevance is about
  whether it applies to the question asked. Overall confidence is a judgement
  driven by the weakest component, not a sum.
- **NATO / Admiralty** deliberately keeps *source reliability* (A–F) and
  *information credibility* (1–6) on two independent axes, because a reliable
  source can report improbable information and an unreliable source can report
  something independently confirmed.

Every established framework in this space separates **what kind of evidence it
is** from **how much and how applicable it is**. None of them blends the two into
one ordinal.

### 2.3 Saturation answers a narrower question than we were using it for

- Guest, Bunce & Johnson (2006): basic metathemes present at 6 interviews; 88%
  of themes and 97% of important themes developed by 12.
- Hennink, Kaiser & Marconi (2017): code saturation at 9–17; *meaning*
  saturation at 16–24.

These numbers describe **thematic completeness**: have I heard all the themes?
They say nothing about **prevalence**: what share of this population would pay?
Those are different claims and they need different mathematics. For prevalence,
the relevant tool is an interval estimate, and it is brutal at small n:

| n | half-width at p = 0.5 (95%, Wilson) |
|---|---|
| 12 | ±0.25 |
| 39 | ±0.15 |
| 93 | ±0.10 |
| 381 | ±0.05 |

Twelve interviews — the saturation number the whole industry quotes — buys a
confidence interval of ±25 percentage points. It is enough to know you have
heard the themes. It is nowhere near enough to say "most practices will pay."

### 2.4 An informant is not an organisation

Wilson & Lilien (1992) showed across 104 buying-centre decisions that
single-informant accounts are structurally unreliable, and that multiple
informants within one organisation are not independent observations of that
organisation. This is already in the PRD as a source. It implies the counting
unit must be the **organisation**, not the interview.

---

## 3. What I tested

Fourteen cases spanning the evidence space, each with a known correct ordering
implied by the papers. Seven ordering constraints, of which six are hard (a paper
states the ordering or it follows directly from the level definitions).

Both engines run on the identical corpus.

### 3.1 The ladder fails the ordering constraints 6 of 7 times

| Constraint | L0–L3 ladder | Structured verdict |
|---|---|---|
| 4 prepayments > 50 discovery interviews | FAIL | PASS |
| 4 prepayments > 30 discovery interviews | FAIL | PASS |
| 3 LOIs > 50 discovery interviews | FAIL | PASS |
| 3 LOIs > 8 budget-holder interviews | FAIL | PASS |
| 2 prepayments + 10 interviews > 12 interviews | FAIL | PASS |
| 6 prepayments > 4 prepayments + 35 interviews | FAIL | PASS |
| 4 prepayments > 30 interviews | PASS | PASS |
| **total** | **1/7** | **7/7** |

The failures are not near-misses. The ladder assigns **L0 — "hypothesis", no
evidence** — to a founder holding **four prepayments** and to a founder holding
**three signed LOIs**. The cause is the L1 row in §4.2: it requires
`distinct source channels ≥ 2`, and both of those founders acquired their
commitments through one channel. A payment is the single strongest signal in the
literature and the engine discards it for failing a diversity rule that was
designed to qualify *talk*.

### 3.2 The failure cannot be fixed by tuning

I enumerated all 4^11 = 4,194,304 possible scalar assignments over the
constrained cases. Only 23,436 (0.56%) satisfy the hard orderings and the
"opinions must not reach the top band" caps. The first satisfying assignment
found collapses six of eleven cases to zero.

The reason is structural. To keep three rungs free above stated opinion — for
commitment, investment, and payment — a four-rung scale must compress opinion
evidence into at most two rungs. It then has to invent a difference between 30
interviews and 50 interviews that no source supports, in order to leave room for
a single LOI above them. That is not a threshold problem. It is the scale
running out of rungs.

### 3.3 The ladder cannot discriminate

Over 14 materially different cases:

| Model | Distinct outcomes | Collided pairs |
|---|---|---|
| L0–L3 ladder | 4 | 22 |
| Structured verdict | 13 | 0 |

Twenty-two pairs of cases that a founder would experience as completely different
situations receive the same verdict. Four prepayments and thirty interviews are
both "L0". Six prepayments and eleven interviews are both "L1".

### 3.4 The replacement passes everything

| Test | Result |
|---|---|
| Pattyn ordering constraints | 7/7 |
| Actionability — apply the named binding constraint, claim must improve | 14/14 |
| Monotonicity — adding evidence never lowers the claim | 0 violations |
| Population gate — wrong-population evidence cannot count | holds |
| Discrimination | 13 outcomes, 0 collisions |

---

## 4. The replacement

A verdict is **three facts and a consequence**, not a score.

```
level     L1..L6   highest evidence type present in the claim's population
support            independent in-population orgs at that level
breadth            independent in-population orgs at any level
saturation         insufficient | basic | code | meaning   (stated evidence only)
interval           Wilson 95% interval                     (prevalence claims only)
binding            population | type | support | null
```

### 4.1 Levels

| Level | Type | What it licenses the founder to say |
|---|---|---|
| L1 | internal | "We believe…" |
| L2 | stated | "N people in this segment told us…" |
| L3 | concept | "We showed N people the concept and…" |
| L4 | commitment | "N organisations committed to X: pilot, LOI, waitlist." |
| L5 | investment | "An investor committed contingent on…" |
| L6 | payment | "N organisations have paid us." |

L1 is a floor, not a finding. Every founder holds an own-itch hypothesis; the
engine never tells someone with evidence that they have none.

### 4.2 What the pair means

`level` and `support` are read together and never collapsed. The same level with
different support is a different claim:

| Case | Verdict | Reading |
|---|---|---|
| 4 prepayments from 4 orgs | L6 / 4, interval [0.51, 1.00] | 100% of the orgs approached paid |
| 4 prepayments from 39 orgs | L6 / 4, interval [0.04, 0.24] | 10% of the orgs approached paid |

Both are L6. They are not the same business, and the interval says so. Under the
ladder these were L0 and L3 — the ordering was not just coarse, it was inverted.

### 4.3 The binding constraint names the one change that raises the claim

Verified by applying it: in all 14 cases, performing the named change raises the
verdict. The four values:

| Binding | Meaning | Fix |
|---|---|---|
| `population` | Nothing you have is about this claim's population | Re-target the next conversations |
| `type` | Population is fine; evidence type caps you | Get the next evidence type up |
| `support` | Type reached, but rests on 1–2 organisations | Repeat it on more organisations |
| `null` | Nothing this week moves it | — |

From L4 the target is L6, not L5. Investor commitment is a different stakeholder
and never validates a customer claim; Pattyn also notes L6 makes L5 unnecessary.

### 4.4 Two claims, two mathematics

The engine takes `claim_type` because the same sample supports one and not the
other:

- `theme` — "buyers struggle with X" → saturation rung applies (6 / 12 / 24).
- `prevalence` — "most buyers would pay" → Wilson interval applies, and the
  saturation number is irrelevant.

This distinction was missing from v1.0 and it is the difference between a useful
warning and a false one: 12 interviews is genuinely adequate for the first claim
and genuinely inadequate for the second.

---

## 5. What this does not establish

Intellectual honesty for the submission, and for the Q&A:

1. **Pattyn et al. is exploratory.** 29 interviews, 16 startups, self-reported
   performance, one geography. It supports an *ordering*, not a necessity. We
   must say "the strongest published ordering", not "proven".
2. **The corpus is constructed, not observed.** The 14 cases are designed to
   probe the space; the orderings come from the papers, but no real founder data
   was run. Fixtures for the build must be re-derived from real discovery notes.
3. **Saturation transfer is an inference.** Guest and Hennink studied thematic
   saturation in interview studies, largely outside B2B software. Applying 12 to
   a B2B segment is a defensible default, not a measurement. It must be
   overridable and labelled.
4. **Wilson assumes random sampling.** Founders recruit by convenience and
   network. The interval is therefore a *best case*: true uncertainty is wider.
   This makes the network-share diagnostic more important, not less — but it
   cannot be a scored threshold without a source, so it stays a caution.
5. **The 6/12/24 rungs are thematic, not prevalence.** Never display them next
   to a willingness-to-pay claim without the interval.

---

## 6. Consequence for the product

Three things change, and one thing gets stronger.

**Changes:**

1. The ladder is replaced by `(level, support)` plus computed precision. §4 of
   the PRD, the threshold table, the finding types, and the four golden fixtures
   all follow from this.
2. The unit of evidence becomes the **organisation**, not the interview. Support
   is counted in independent orgs; a roster of 11 interviews from 5 orgs is 5.
3. The unsourced network-share caps (60 / 50 / 30%) **leave the verdict path**.
   They were the weakest part of the design and unanswerable in a Q&A. Channel
   spread and network share become reported diagnostics, not scored gates. Every
   number that can change a verdict now traces to a citation or a formula.

**Gets stronger:** the product's thesis. Pattyn establishes that *type* orders
evidence and that quantity does not. He does not measure who was in the room. So
the two axes are genuinely complementary: the literature owns the vertical, we
own the horizontal. `level × support` is not a compromise between two models —
it is the intersection nobody has built.

The pitch becomes: *"Your evidence has a ceiling set by its type, and a weight
set by who was in the room. No amount of interviews raises the ceiling."*

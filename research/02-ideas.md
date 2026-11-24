# HETIC 2026 — Six Project Ideas & Flagship Plan

Companion to `01-brief-and-gaps.md`. Read the gap map first; the ideas only make sense against it.

Scoring is 1–5, and deliberately harsh. A 5 on *white space* means I could not find a shipping product doing the core mechanism.

> **Superseded detail.** This document records why the idea was chosen. The engine described below — a four-verdict ladder, pure Python, three fixtures — was later falsified and replaced. The current design is in `docs/01-prd.md` §4, and the audit is `03-engine-findings.md`. Keep this file for the reasoning, not the implementation.

---

## Idea 1 — **n=** · Evidence Coverage Auditor  ★ FLAGSHIP

**One line:** An agent that audits the *validity of a founder's customer-discovery evidence* — who was in the room, how many, in which cells — and refuses to issue an investor-grade evidence statement until the founder resolves every claim the sample cannot carry.

**The gap.** Every discovery tool audits the transcript. FounderGate flags compliments and leading questions; Unpitched scores talk-time; CoLoop flags leading questions live. None of them ask the question that determines whether the interview was worth doing: *was this the right person, and are there enough of them?* The data says that is where the loss is — 58% of founders validate by "asking people I know," only 23% use structured methods with their actual market, and the average cost of the resulting rework is $4,200 plus 3.2 months. Meanwhile the published saturation thresholds (12 per homogeneous segment; 20–50 while still discovering who the customer is; 15–25 per segment for comparison; three independent mentions before it counts) are precise, checkable, and used by no product.

**Mechanism.** Claims × roster → a segment/role coverage matrix → a deterministic verdict per claim.

| Verdict | Meaning |
|---|---|
| `SUPPORTED` | Required n met, required role present, independence satisfied |
| `UNDERPOWERED` | Right people, too few — "true so far, not yet a pattern" |
| `WRONG POPULATION` | Evidence exists, but from users when the claim is about buyers |
| `UNTOUCHED` | No interview bears on this claim at all |

The demo moment is the **empty cell**: a heatmap where the row "practice manager (economic buyer)" is zero across every column, while the founder's willingness-to-pay claim sits in `UNDERPOWERED` with `n=0 decision-makers`. Five seconds, no explanation needed.

**The load-bearing checkpoint.** The Evidence Statement does not render until, for every non-supported claim, the founder picks: *downgrade to hypothesis* / *fund N interviews in cell X* / *accept with a stated limitation* — **and types the falsifier**: "this claim dies if ___." The agent cannot compute that. It is a bet, not an extraction. This is what makes the 20% criterion structural rather than cosmetic.

**Architecture.** Roster CSV + claims in natural language. Phase 1: LLM formalises each belief into (population, predicate, threshold) — founder confirms, because the model reliably gets the population wrong. Phase 2: **pure Python** builds the matrix and computes every verdict from a threshold table. Phase 3: one cheap LLM call per interview to label which claims it touched; human can override in the UI. Phase 4: blocking checkpoint. Phase 5: export the Discovery Evidence Statement — the one-pager you'd actually put in a data room.

**Reliability story (this is the differentiator).** The model never touches the arithmetic. Same roster, same score, bit-for-bit, whichever model is selected. Put a *Recompute with a different model* button in the demo: the numbers don't move. No competitor can make that claim, because they put an LLM in the scoring path.

**Frugality.** ~20 LLM calls per full run (6 claim formalisations + 11 interview labels + 1 summary). Gemini 3.5 Flash-Lite free tier is 500 RPD / 15 RPM; Groq free tier for the classifier; Ollama `qwen2.5:7b` as the offline demo fallback. Cost per run: €0.00. State that number on the slide.

**Time saved.** The Discovery Evidence Statement is normally 6–8 hours of notes cleanup and slide-building for a fundraise → ~20 minutes. Secondary: prevents the 3.2-month / $4,200 rework cycle. Two numbers, both sourced.

**Demo beat.** 11 interviews, all sourced from one founder's network → heatmap shows 9/11 in a single cell, 0 economic buyers → claim "€200/mo" flagged → founder types a falsifier → export unlocks and shows the recruiting brief for the missing cells.

**Risks.** (a) Reads as "you did it wrong" — mitigate with tone: the agent reports coverage, never characterises the founder. (b) Thin if it's *only* a matrix — the export artefact and the recruiting brief are what make it a product. (c) Time-saved is indirect — lead with the 6–8 hour number, keep the rework number as support.

**Rubric:** 24/25 value, 20/20 human judgment, 18/20 reliability, 15/15 frugality, 9/10 UX, 10/10 docs. Best fit on the board.

---

## Idea 2 — **One Truth** · Cross-Artefact Coherence Auditor

**One line:** Finds the contradictions *between* a founder's deck, CRM, interview roster and GTM plan — the ones no single-document checker can see.

**The gap.** CiteJury checks claims against the public web. askOdin Crucible checks the deck against the financial model and found the pattern precisely: "founders describe the problem well; two in three describe the business badly." Neither checks whether the *story* matches the *evidence*. Your deck says mid-market HR directors; 80% of pipeline is enterprise; all eleven interviews were consultants. Every artefact is internally consistent. The contradiction only exists between them — which is exactly where a human reviewer looks and where no tool looks.

**Mechanism.** Extract a typed entity graph from each artefact (segment, buyer role, price point, wedge, proof claim). Reconcile across sources. Every conflict becomes a node the founder must resolve by naming the canonical definition and marking the others deprecated. Output: a one-page "single source of truth" plus a list of every asset that still contradicts it.

**Checkpoint.** The founder cannot merge conflicts — they must *choose*, and the choice is recorded with a timestamp and a reason. That's a real judgment (which definition is the business?) and it's the kind of decision an agent should never make.

**Time saved.** 6–10 hours reconciling materials before a raise, plus the diligence delay from unexplained contradictions. Strongest time-saved story of the six.

**Risk.** Cold start is heavy — needs four artefacts before it says anything. Mitigate by shipping a seeded demo workspace and letting a single deck + roster run a reduced check. *Adjacent competitors exist on the numeric axis; the qualitative/ICP axis is open.*

**Rubric:** 25/25 value, 17/20 HJ, 17/20 reliability, 13/15 frugality, 8/10 UX, 9/10 docs.

---

## Idea 3 — **Commitment Map** · Competitive Doctrine Agent

**One line:** Maps what competitors have *committed to* — not what features they have — and watches for the moves that break those commitments.

**The gap.** The category's own reviews say the same thing: the only criticism shared by all four leading CI platforms is irrelevant alerts and "AI not smart enough to filter." And the sharpest practitioner critique is that the feature matrix is not just useless but *harmful* — "the gaps are the roadmap... which is how a product becomes the average of its category." What actually constrains a competitor is commitment: pricing architecture, a segment they publicly abandoned, a channel they built, an integration they shipped, a compliance posture. Commitments are slow, visible and expensive to reverse, which makes them the only durable basis for a strategic read.

**Mechanism.** For each competitor, extract commitments with evidence and a date. Score each new signal on *commitment-breaking* — a pricing change that cannibalises their enterprise tier, a mid-market hire wave after positioning upmarket. Output: a one-page doctrine with a "so what" and a "what would change our mind" column. One page, not twenty.

**Checkpoint.** The founder ranks which commitments matter, and writes the response — the agent will not recommend a strategic move.

**Time saved.** Modest: ~2 hours/month of monitoring review, replacing a $30k/yr platform or a five-tool DIY stack that becomes "a part-time job." **This is the weak point** — it scores badly on the 25% criterion relative to the other five.

**Rubric:** 18/25 value, 18/20 HJ, 17/20 reliability, 14/15 frugality, 8/10 UX, 9/10 docs.

---

## Idea 4 — **PriceProof** · Revealed-Preference Pricing Agent

**One line:** Refuses to report a willingness-to-pay number from stated preference, and instead designs the cheapest test that produces a real one.

**The gap.** Stated WTP is noise for novel products: customers anchor to switching effort, they systematically undervalue unexperienced benefits, and naming a price first contaminates the answer. The standard founder move — "would you pay €29/month?" — produces an artefact of the question. Meanwhile every validation tool happily averages those answers into a demand score.

**Mechanism.** Given a price hypothesis, the agent classifies the evidence type (survey opinion / interview statement / LOI / prepayment / real conversion), scores it on the stated-to-revealed ladder, and **will not emit a WTP figure from anything below LOI**. It then designs the next cheapest test: a price ladder, a prepay offer, a fake door with a real checkout, a signed LOI template. The founder chooses the test and the failure threshold *before* it runs.

**Checkpoint.** Pre-committing to the threshold that counts as failure — before seeing the result. This is textbook active verification, and it's the single best defence against the founder rationalising a bad number.

**Time saved.** Moderate (a few hours designing the test), but it prevents a pricing rebuild.

**Risk.** The demo needs a transaction to be convincing, and a synthetic one weakens it. Build the demo around a seeded fake-door funnel with real numbers.

**Rubric:** 19/25 value, 19/20 HJ, 16/20 reliability, 14/15 frugality, 8/10 UX, 9/10 docs.

---

## Idea 5 — **Falsifier** · Pre-Registration & Calibration Journal

**One line:** The founder writes down what they expect *before* each interview; the agent scores whether they were right, and shows the calibration curve.

**The gap.** Zero products do this. It is the cheapest possible implementation of the one intervention the cognitive-forcing literature actually supports: **active verification** — commit to your own answer before seeing the AI's, which beats forced delay and beats explanations (explanations can *increase* overreliance). It is also the only mechanism that makes sycophancy structurally impossible: the agent cannot flatter a prediction that was already written down.

**Mechanism.** Pre-interview: one prediction + a confidence percentage. Post-interview: the agent compares the prediction to what was actually said and scores it. Over a round you get a calibration curve and a Brier score. "You were 90% confident on eleven predictions and right on four."

**Checkpoint.** Maximally load-bearing — the human supplies the input the entire product is built on, and cannot see the AI's read first.

**Weakness, stated plainly.** It *adds* minutes to the founder's week. Against a mission of "give them back time," that is a hard sell on the 25% criterion. **Best used as a feature inside Idea 1** rather than a standalone product — it makes the checkpoint richer and costs almost nothing to build.

**Rubric:** 14/25 value, 20/20 HJ, 17/20 reliability, 15/15 frugality, 8/10 UX, 8/10 docs.

---

## Idea 6 — **Red Room** · Investor Objection Pre-Mortem

**One line:** Generates the twelve questions that will kill the round, maps each to the evidence that would answer it, and shows which ones you cannot answer.

**The gap.** Founder-side diligence red-teaming is thinner than VC-side tooling, and objection generators are commoditised by any competent LLM prompt. The only defensible version is the *evidence mapping*: not "here are hard questions" but "question 7 has no answer in any document you own."

**Why it ranks last.** The core mechanism is a prompt, the output is a list, and askOdin already audits the adjacent surface for free. Strong as a bolt-on to Idea 2, weak as a submission.

**Rubric:** 15/25 value, 15/20 HJ, 12/20 reliability, 14/15 frugality, 8/10 UX, 9/10 docs.

---

## Comparison

| # | Idea | White space | Time saved | Human judgment | Demo power | 3-week feasibility | Total |
|---|---|---|---|---|---|---|---|
| 1 | **n=** Evidence Coverage | 5 | 4 | 5 | 5 | 4 | **24** |
| 2 | One Truth coherence | 4 | 5 | 4 | 4 | 3 | 20 |
| 4 | PriceProof | 4 | 3 | 4 | 3 | 3 | 17 |
| 3 | Commitment Map | 4 | 2 | 4 | 3 | 4 | 17 |
| 5 | Falsifier | 5 | 2 | 5 | 4 | 4 | 20* |
| 6 | Red Room | 2 | 3 | 3 | 3 | 5 | 16 |

\* Falsifier scores well but loses on the 25% criterion. Fold it into #1.

**Recommendation: build #1, absorb #5 as the checkpoint mechanic, mention #2 as the roadmap.**

---

## Flagship build plan — **n=**

### Positioning sentence (use it verbatim in the submission)
> Every discovery tool audits what your customers said. n= audits whether you talked to enough of the right ones — and refuses to write your evidence statement until you decide what you're willing to bet on.

### Week 1 — the engine, no UI
- JSON schema for claims and roster. Threshold table by claim type, sourced and cited.
- `coverage.py`: segment × role matrix, per-cell counts, decision-maker %, independence %, per-claim verdicts. **Pure functions, no model, unit-tested.**
- Claim formalisation prompt + a human confirm step in the CLI.
- One classifier call per interview → which claims it touched.
- Success criterion: `python audit.py --roster demo.csv --claims demo.json` prints the correct verdicts for three hand-built test rosters (clean, underpowered, wrong-population).

### Week 2 — the interface
- Next.js + Tailwind, single page, three zones: coverage heatmap / claim ledger / checkpoint drawer.
- The blocking checkpoint: unresolved claims keep the export button disabled, server-side too (not just greyed out — the 422 matters, judges test these things).
- Export: a real one-page PDF/HTML Evidence Statement with the matrix, the verdicts, the falsifiers, and the recruiting brief.

### Week 3 — the submission
- Seed three demo workspaces. Record the 3-minute video in one take, no cuts, showing the full run including the checkpoint.
- AI Disclosure Statement: models used, what each prompt does, that the tooling was AI-assisted, that the demo roster is synthetic and labelled.
- Responsible AI: name the real failure mode — the tool could be used to *manufacture* the appearance of rigour (talk to 20 people, get a green heatmap, claim validation). Mitigation: the export always prints coverage *and* gaps, and `SUPPORTED` is capped below "validated."
- Time-Saved Report: 6–8 hrs → 20 min for the evidence pack; 3.2 months of rework avoided. Show the arithmetic.

### Cut list — decide now
No auth. No database (JSON files). No transcript ingestion in v1 (roster CSV only — FounderGate owns transcripts; don't fight there). No integrations. No multi-user. No mobile.

### Three-minute demo script
1. **0:00–0:25** — The claim. "This founder has 11 interviews and a €200/month price. Every tool says the discovery is done." Show the folder.
2. **0:25–1:10** — Drop the roster in. Heatmap renders. Camera holds on the empty row: zero economic buyers. Say nothing for two seconds.
3. **1:10–1:50** — Claim ledger. "€200/month" → `UNDERPOWERED`, `n=0 decision-makers`. "Churn will be low" → `UNTOUCHED`.
4. **1:50–2:30** — The gate. Export is disabled. Founder types: "dies if practice managers already have a billing workaround they're happy with." Export unlocks. **This is the 20%.**
5. **2:30–2:55** — Recompute with a different model. Numbers don't move. "The model never touches the arithmetic."
6. **2:55–3:00** — The output: a one-page evidence statement an investor would actually accept, and the recruiting brief for the three missing cells.

### The one-sentence answer to "why won't ChatGPT do this?"
> It will — it'll write you a confident paragraph. It won't tell you that nine of your eleven interviews were the same person's friends, because that fact isn't in the transcript. It's in the roster, and nobody puts the roster in the prompt.

---

## Judge-proofing checklist

- [ ] Run works end-to-end on a free key a judge can obtain in 30 seconds — or with no key at all via Ollama.
- [ ] Every number on screen traces to a cited threshold or a visible count.
- [ ] The checkpoint is enforced server-side, not just in the UI.
- [ ] A stated limitation that is real, not humble-bragging.
- [ ] AI Disclosure names models, prompts, and human-authored sections.
- [ ] Repo has a README that runs in three commands.
- [ ] The video shows a *failure* or a *refusal*, not only a success. Judges trust tools that say no.

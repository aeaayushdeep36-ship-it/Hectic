# HETIC 2026 — Brief Decode & Gap Map

Research date: 24 Nov 2026. Submission closes 18 Dec 2026, 17:00 CET. Judging 19 Dec – 8 Jan.

---

## 0. Decode the rubric before you decode the market

The brief is written to look like a productivity-tool competition. It isn't. Read the weights as a stack of constraints, in order:

| Weight | Criterion | What it actually filters out |
|---|---|---|
| 25% | Business value & time saved | Anything without a number attached to a real task |
| 20% | **Human judgment by design** | Any agent that produces a finished answer |
| 20% | Agent design & reliability | Prompt-chains with no failure states |
| 15% | Frugality & accessibility | Anything needing a paid key |
| 10% | UX | Dashboards nobody would open twice |
| 10% | Documentation & responsible AI | Undeclared AI assistance |

Two consequences that most teams will miss:

**The 20% criterion is a prohibition, not a bonus.** The mission sentence is explicit: *"give them back time for what no agent should decide for them: judgment."* A "human-in-the-loop" approve button scores near zero here, because the agent has already done the deciding and the human is rubber-stamping. To score, the artefact must be **unusable until the human supplies something the agent cannot compute** — a trade-off, a falsifier, a risk appetite, a bet. If the demo can proceed with the human clicking "Approve" twelve times, you have built a 0/20.

**The 15% criterion rewards arithmetic, not model choice.** "Runs on free models" is table stakes by December. What scores is showing that you *removed* the model from steps where it wasn't needed. Deterministic computation is cheaper, faster, and — critically — **reproducible**, which feeds the 20% reliability score too. One design decision, two criteria.

**The 10% documentation score is the cheapest 10% on the board**, and it is the one students skip. An AI Disclosure Statement that names every model, every prompt's purpose, and every place a human wrote the output is nearly free marks. Same for a Responsible AI section that names a real failure mode and the mitigation, instead of boilerplate.

> **Judges to write for:** Prabhas Kumar (BCG), Sudhindra Desai (Visa), Jhan Liufu (Caltech). That is a strategy consultant, a payments operator, and a scientist. They will reward: a defensible number, a mechanism, and an honest limitation. They will not reward: a beautiful dashboard around an LLM opinion.

---

## 1. Competitive reality

543 participants, gallery unpublished at time of research — so you cannot see the field. But two submissions are already publicly indexed, and they are informative:

**FounderGate — Adversarial Mom-Test & GTM Discovery Agent.** Multi-agent, transcript-in, dual "Optimistic Extractor" vs "Mom-Test Skeptic", flags compliments/hypotheticals/leading questions, halts at `HALTED_AT_HUMAN_GATE`, produces an Assumption Debt Ledger and GTM wedge. Free-tier stack (Gemini/Mistral/Groq/Ollama), n8n export, bilingual EN/FR. This is a strong, well-scoped submission and it occupies the most obvious reading of "customer discovery + human judgment."

**FounderFlow AI.** Colab notebook, market research + competitor scan + explicit human validation gate. Thinner, but it confirms the default shape of the field: *research agent → report → approve button.*

**Implication:** the median submission in December will be an n8n/LangGraph research agent with a checkpoint and a nice UI. To place, you need a mechanism that is **not a report**, and a claim that is **checkable in the demo**.

**Where FounderGate leaves the door open** — read its feature list closely and note what is absent:
- It ingests **transcripts**. It audits *what was said*. It never asks *who was in the room*.
- Its unit of analysis is the **quote**. Its output is adjudicated claims.
- It has no notion of **sample size, segment composition, independence, or saturation**.
- It generates "the next five non-leading questions" — quality of asking, not validity of inference.

That is a real seam. Interview technique and interview *evidence* are different objects. You can run a flawless Mom-Test interview with nine friends and learn nothing about a market.

---

## 2. Track-by-track saturation map

### 2.1 Ideation — **saturated. Do not enter.**
Idea-validation is the most crowded consumer-AI category in this space. Comparison roundups score nine tools on price-per-validated-idea; "Veto" ships a five-gate kill framework with fact-quality tiers and mandatory counter-search; validation platforms sell AI-moderated panels at ~$30/interview with 4M-person panels. The *form* (score my idea, five gates, go/no-go verdict) is fully colonised.

Residual gap: almost none that is defensible in three weeks. The only live angle is that all of these tools **answer**; none of them make the founder produce the answer first. That is a feature, not a product.

**Verdict: avoid entirely.** Entering here means competing on UI against funded products with panel access you don't have.

### 2.2 Customer discovery — **half-occupied. One clear seam.**
Occupied: transcript summarisation, quote extraction, Mom-Test compliance flagging (FounderGate, Unpitched, CoLoop, Chanl, Product Talk's coach), participant recruiting (User Intuition, Great Question, Instantly).

Unoccupied: **the validity of the evidence base itself.** The field's own literature says the failure mode is upstream of the transcript:

- 67% of founders say they validated before building, but only **23% used structured methods with their actual target market**. The single most common method — used by **58%** — was *"asking people I know."* (SegmentOS, 500 founders, Q1 2026)
- ~~Average post-launch rework from unvalidated assumption: $4,200 and 3.2 months.~~ **Withdrawn during remediation**: the figure circulated in secondary roundups but no primary source was found. It is not used as evidence anywhere in the submission.
- Saturation thresholds are published and specific: ~12 interviews within a homogeneous segment (Guest, Bunce & Johnson 2006); core range 9–17 (Hennink & Kaiser 2022); **20–50 conversations while you are still discovering who the customer is**; 15–25 *per segment* if comparing segments. "Three independent mentions before anything counts as a pattern."
- Single-informant buying-centre research is structurally weak: across 104 buying-centre decisions, multi-informant models significantly outperformed single-informant ones (Wilson & Lilien 1992). One informant per account is "the cheapest way to be confidently wrong."
- And the question investors actually open with is not "what did they say" but **"who did you talk to, and how many?"**

No product takes a founder's interview roster and audits it. That is the seam.

### 2.3 Market research — **occupied, and by better-funded tools than you.**
I assumed this was open. It isn't. As of late 2026 there is a dense field of claim-provenance products:

- **CiteJury** — deck/memo upload, up to 25 claims, multi-model adjudication, word-for-word quote verification, Excel export for the deal file. Explicitly covers circular sourcing ("ten articles quoting one figure are one source, not ten").
- **LiquiChart** — hop-by-hop citation chain tracing up to 10 hops, terminus classification including *circular citation* and *value mutation* (a 35% stat becoming 37% through rounding), Citation Depth Score.
- **Rathvane Deck Check**, **DeckScope**, **veridive MCP**, **ConvergePanel**, plus an off-the-shelf "Founder Pitch Deck Claim Check Agent."

This is the most important negative finding of the research. The "circular citation detector" idea — which is genuinely clever and demos beautifully — **already exists in at least two shipping products**, one of which is built specifically around the citation-chain graph. Building it in three weeks gets you a worse CiteJury.

Residual gap: only the *internal* dimension — claims checked against **your own numbers and your own evidence**, not the public web. Which leads to §3.1.

### 2.4 Lead generation — **saturated and reputationally toxic. Avoid.**
115+ AI SDR vendors. Reply rates fell to ~5.8% in 2024, down 14.7% year over year, as volume rose. Generic AI personalisation is now detectable by recipients. Gmail/Yahoo bulk-sender rules tightened. The category's core promise (more volume) is the opposite of its core problem (noise). Nothing you build in three weeks beats Apollo + a good prompt, and judges have seen forty of these.

### 2.5 Go-to-market — **tooling crowded, thinking unserved.**
Positioning/messaging tools exist (MITPO, BrandGap, SmokeLadder, IMPACT, PMM Tools). Competitor monitoring is crowded at both ends: Klue/Crayon at ~$30k/yr median, and a long tail of $19–$99/mo watchers (Kompetar, Competely, Competiflow, Visualping).

But the category's own user research says the tools solve the wrong half. Coding 500 verified G2 reviews of the four leading CI platforms: the **only** criticism shared by all four at material frequency is **irrelevant alerts / "AI not smart enough to filter."** And practitioner after practitioner says the same thing — *"noise with no so what,"* *"if you cannot name a decision you would make differently, you have produced knowledge rather than intelligence."*

The sharpest unserved idea in this track, from a 2026 practitioner piece: the **feature matrix is actively harmful**. A tick you don't have can be built; a tick you do have can be copied. It tells you what is true this quarter and implies the gaps are your roadmap — "which is how a product becomes the average of its category." What constrains a competitor is not features but **commitments** — pricing architecture, a segment they've publicly abandoned, a channel they've built, an integration they've shipped, a compliance posture. Commitments are slow, visible, and expensive to reverse.

No tool maps commitments. That is fresh.

### 2.6 Investor preparation — **split: decks saturated, diligence half-covered, founder-side red team thin.**
Deck generation: ~47M AI-generated business decks per month; VCs openly say 40–80% of inbound looks machine-made. Dead category.

Deck *auditing* is more interesting and partly taken: **askOdin Crucible** runs a free forensic audit of deck-vs-model consistency (claims 40% MoM growth, model shows 12%), scored 2,488 decks, median 35/100, 70% PASS — and identifies the failure precisely: *"Founders describe the problem well. Two in three describe the business badly."* Octopus Ventures documents the same pattern from the investor side (deck says 18 months runway, model says 11; deck says £3M ARR, customer cube rebuilds to £2.4M).

So: **numeric internal consistency is taken.** What is not taken is **narrative-vs-evidence consistency** — does the story you tell investors match the evidence you actually collected? That is the gap.

---

## 3. Five structural gaps (cross-cutting)

These matter more than any single track, because they are where a 3-week build can beat a funded product.

### 3.1 Nobody checks claims against *your own evidence*
CiteJury checks your claims against the public web. askOdin checks your deck against your model. **Nothing checks your pitch against your interviews, your CRM, and your GTM plan simultaneously.**

The highest-value version of this: your deck says the ICP is mid-market HR directors; 80% of your pipeline is enterprise; all eleven of your interviews were with consultants you met at a conference. Every individual artefact is internally consistent. The contradiction only exists *between* them — which is exactly where a human reviewer looks, and exactly where no tool looks.

### 3.2 Every tool produces an artefact; none refuse
The universal shape is input → report → approve. The mission asks for the opposite: an agent that withholds output until judgment is supplied. **Refusal is the differentiator.** A tool that says "I will not write your market sizing until you tell me which of these two definitions you mean, and why" is doing something no competitor does — and it scores the 20% criterion structurally rather than cosmetically.

### 3.3 The evidence literature is rich and completely unused by products
Saturation thresholds, single-informant bias, independence of sample, base rates, diagnosticity, revealed vs. stated preference — all published, all specific, all absent from every founder tool I found. The tools use *heuristics* ("did you ask a leading question?"). The literature uses *counts and structure*. Counts are checkable, and checkable is demoable.

### 3.4 AI is used where determinism would be better
Coverage arithmetic, citation-hop matching, and numeric reconciliation are all deterministic. Teams put an LLM there anyway, then can't explain why the output changes between runs. Every one of those steps you move to plain code buys you reliability points *and* frugality points, and gives you a line judges remember: *"the model never touches the arithmetic."*

### 3.5 Sycophancy is the real enemy, and the fix is sequencing, not prompting
Measured sycophancy runs at 58% across models (SycEval), and social sycophancy sits ~45 percentage points above human baselines (ELEPHANT). Sycophantic chatbots measurably reduce users' willingness to correct their own misconceptions. Prompting "be critical" does not fix this reliably.

What does work, per the cognitive-forcing literature: **active verification** — commit to your own answer *before* seeing the AI's. That beats forced delay, and beats explanations (which can *increase* overreliance). This is a sequencing constraint on your UX, and it is nearly free to implement: ask the human first, then reveal. Almost no submission will do it.

---

## 4. The three traps

1. **"Adversarial" as a personality.** A model told to be skeptical produces skeptical-sounding text, not skepticism. Judges can test this in thirty seconds by feeding it a good idea. Skepticism must be **structural** — a count, a threshold, a missing cell — not a tone.
2. **The approve button.** If your human checkpoint is a button, you have scored 0 on the criterion worth 20%. Design the checkpoint so the artefact **cannot render** without a typed judgment.
3. **Breadth.** Six tracks, one 3-minute video. Pick one step, own it completely, and mention the others only as "next."

---

## 5. What this leaves

The open space is not "better research." It is **the validity of the evidence a founder is reasoning from** — the thing that is upstream of every artefact, invisible in every transcript, and the first question every investor asks.

Ideas and the flagship build plan: `02-ideas.md`.

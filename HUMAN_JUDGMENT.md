# Human Judgment

*Devpost section — Hectic, AI Agents for Founders Challenge.*

> Hectic is an independent student project submitted to the AI Agents for Founders Challenge. It is not affiliated with, endorsed by, or produced by HETIC.

Hectic is built around a refusal: a language model may help a founder *say*
what they believe, but it may never decide what the evidence supports. The
verdict is arithmetic over a roster the founder supplied. Everything a model
touches is provisional until a person accepts it, and the export is locked
until the person has answered for every claim the sample cannot carry.

## The four layers, plainly

**1. The founder confirms what the claim means.**
A model proposes a population, a predicate, a kind and a claim type from one
sentence. None of those fields is accepted silently. The founder sees the
proposal, its ambiguity flags and the exact source sentence, and confirms it
before it enters the ledger. This matters because the predictable failure of a
small chat model is *widening* the population — "dental practice managers"
becomes "healthcare professionals" — which makes a thin sample look adequate.
The proposal schema has no level, count, score or verdict field, so the model
cannot pre-empt the arithmetic even by accident.

**2. The founder can see and override every relevance tag.**
A model tags which interview notes bear on which claim, in one batch per claim.
The tags are stored with a producer label, rendered in the reasoning-trace
panel of each finding, and overridable. The override is recorded separately so
the audit log shows both what the model said and what the person decided. A
deterministic fallback (`bearsOn: false` unless two distinct predicate terms
appear in the notes) is used whenever the provider fails validation, so silence
is never counted as evidence.

**3. The founder must resolve every claim the sample cannot carry.**
For each non-`SUPPORTED` finding, the founder chooses an action
(`downgrade`, `fund_gap`, `accept_limitation`, `discard`), names a target level,
and writes a falsifier: an observable, measurable condition that would make them
abandon the claim. "If I want" is rejected; "if fewer than 3 of 5 managers say
X" passes. The check is shared by the drawer and the service, so the UI cannot
be more permissive than the server. This is the bet the tool cannot place for
you.

**4. The export gate is enforced four times, not once.**
The statement cannot be produced until every finding is resolved:

| Enforcement point | What it does |
|---|---|
| Service (`server/store.ts`) | `exportGate()` returns the unresolved claim IDs; `markExported()` throws `UnresolvedFindingsError` |
| HTTP route (`app/api/runs/[id]/export/route.ts`) | Returns 422 with `{ error: "UNRESOLVED_FINDINGS", unresolved }` |
| Database trigger (`trg_export_requires_resolution`) | Aborts a direct `UPDATE runs SET status = 'EXPORTED'` — there is no back door |
| Statement page | An unverified-draft watermark is printed until the run is actually exported |

## Why this is a design claim, not a workflow note

The provider-swap test is the proof. Change the model, or make two providers
fail in different ways, and the finding hash is byte-identical while the
fallback behaviour is the same. A model can change the *words* around a verdict;
it cannot change the verdict, the binding constraint or the count of
independent organisations. When the model is wrong, a person is in the loop at
the exact point where the error would matter, and the correction is recorded.

## The honest limit

Human-in-the-loop is only as strong as the human. A founder can click through
the confirmation screen, accept a widened population, or write a weak falsifier
that still passes the observable check. Hectic makes those decisions visible and
hard to miss; it cannot make them wise. The printed statement therefore carries
its own limitations: a level means the strongest evidence type present with
this many independent organisations, not that the conclusion is true.

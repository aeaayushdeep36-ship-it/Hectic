/**
 * Deterministic fallbacks shared by the agents and the mock provider.
 *
 * Keeping these here means the offline mock exercises exactly the same
 * conservative heuristics as the production fallback path. Nothing in this
 * file emits a level, a count, a score or a verdict.
 */
import { guard } from "./guard";
import { claimProposalSchema, relevanceTagSchema } from "./schemas";
import type { Claim, EvidenceRow } from "./types";

const PREVALENCE = /\b(most|majority|percent|%\b|rate|share|half|out of ten|of \d+)\b/i;
const WTP = /\b(pay|price|per month|\/mo|€|£|\$|willing)\b/i;
const FREQUENCY = /\b(every|daily|weekly|often|frequency|each week)\b/i;

const ROLE = /\b(managers?|founders?|engineers?|doctors?|dentists?|buyers?|users?|owners?|teachers?|nurses?|lawyers?)\b/i;

export type ClaimProposal = ReturnType<typeof templateProposal>;
export type RelevanceTag = ReturnType<typeof heuristicTag>;

/** Narrow by construction: it never widens a population. */
export function templateProposal(rawText: string) {
  const flags: string[] = [];
  const roleMatch = rawText.match(ROLE);
  const population = roleMatch ? roleMatch[0] : "";
  if (!population) flags.push("POPULATION_UNSTATED");
  if (!/\b(in|at|from|across)\b/i.test(rawText)) flags.push("GEOGRAPHY_UNCLEAR");
  if (PREVALENCE.test(rawText) && WTP.test(rawText)) flags.push("SPLIT_REQUIRED");

  const kind = WTP.test(rawText)
    ? "willingness_to_pay"
    : FREQUENCY.test(rawText)
      ? "frequency"
      : "pain";

  return claimProposalSchema.parse({
    rawText,
    // An explicit placeholder is safer than "the people named in the claim":
    // it cannot be mistaken for a population the founder already specified.
    population: population || "UNSPECIFIED — founder must confirm",
    predicate: rawText,
    kind,
    claimType: PREVALENCE.test(rawText) ? "prevalence" : "theme",
    rationale: "Deterministic template. No model was available; every field remains editable.",
    ambiguityFlags: [...new Set(flags)],
  });
}

/**
 * A tag needs two distinct predicate terms in the notes. Silence, politeness
 * and a single shared word are not evidence. Names are redacted first.
 */
export function heuristicTag(
  notes: string,
  predicate: string,
  evidenceId: string,
  claimId: string,
) {
  const checkedNotes = guard(notes).redacted.toLowerCase();
  const checkedPredicate = guard(predicate).redacted.toLowerCase();
  const needles = checkedPredicate
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 6);
  const hits = needles.filter((word) => checkedNotes.includes(word)).length;
  const bearsOn = hits >= 2;
  return relevanceTagSchema.parse({
    evidenceId,
    claimId,
    bearsOn,
    polarity: bearsOn ? "supports" : "ambiguous",
  });
}

export function templateTag(row: EvidenceRow, claim: Claim) {
  return heuristicTag(row.notes, claim.predicate, row.id, claim.id);
}

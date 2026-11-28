/**
 * Deterministic prose. No model call, no network, no clock.
 * This is the fallback used when a provider is unreachable and in --no-llm mode.
 */

import type { Claim, Finding, Verdict } from "../lib/types";
import { LEVEL_LABELS, MIN_SUPPORT, nextTarget } from "./thresholds";

function describeVerdict(verdict: Verdict): string {
  const label = LEVEL_LABELS[verdict.level];
  const orgs = verdict.support === 1 ? "1 org" : `${verdict.support} orgs`;
  return `L${verdict.level} ${label} · ${orgs}`;
}

export function explain(claim: Claim, finding: Finding): string {
  const verdict = finding.verdict;
  const prefix = describeVerdict(verdict);

  switch (finding.kind) {
    case "WRONG_POPULATION":
      return `${finding.evidenceElsewhere} interviews exist, but none is in this claim's population (${claim.population}). Re-target the next conversations before analysing this claim.`;

    case "UNTOUCHED":
      return `No external evidence is attached to this claim. It rests at L1 internal · 0 orgs — a hypothesis, not a finding.`;

    case "SUPPORTED":
      return `${prefix} meets the claimed L${claim.claimedLevel}. ${precisionNote(verdict)}`.trim();

    case "IMPRECISE":
      if (claim.claimType === "theme" && verdict.saturation === "insufficient") {
        return `${prefix} reaches the claimed type, but thematic saturation is insufficient (fewer than 6 independent organisations).`;
      }
      if (claim.claimType === "prevalence" && !verdict.interval) {
        return `${prefix} reaches the claimed type, but prevalence counts (k of n) are missing or exceed in-population organisations.`;
      }
      return `${prefix} reaches the claimed type, but the ${formatInterval(verdict)} interval is too wide for the precision this claim asks for. ${precisionNote(verdict)}`.trim();

    case "DOWNGRADE":
      if (verdict.level >= claim.claimedLevel && verdict.support < MIN_SUPPORT) {
        return `${prefix} reaches L${claim.claimedLevel}, but rests on fewer than ${MIN_SUPPORT} independent organisations. ${action(verdict)}`;
      }
      if (verdict.level >= claim.claimedLevel) {
        return `${prefix} is challenged by contradicting evidence in this population. ${action(verdict)}`;
      }
      return `${prefix}, not L${claim.claimedLevel}. ${action(verdict)}`;
  }
}

function action(verdict: Verdict): string {
  switch (verdict.binding) {
    case "population":
      return "Population is the constraint: re-target the next conversations.";
    case "type": {
      const next = nextTarget(verdict.level);
      return `Type is the constraint. More of the same interviews will not move it; get one organisation to the next evidence type (L${next}).`;
    }
    case "support":
      return `Type is reached, but it rests on fewer than ${MIN_SUPPORT} organisations. Repeat it on more independent organisations.`;
    case null:
      return "Nothing in this week's work moves the constraint.";
  }
}

function formatInterval(verdict: Verdict): string {
  if (!verdict.interval) return "";
  const [lo, hi] = verdict.interval;
  return `95% [${lo.toFixed(2)}, ${hi.toFixed(2)}]`;
}

function precisionNote(verdict: Verdict): string {
  if (!verdict.interval) return "";
  return `${formatInterval(verdict)} is a best case: it assumes random sampling, which a founder's network never gives. True uncertainty is wider.`;
}

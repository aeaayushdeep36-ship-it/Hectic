/**
 * The public engine surface. Everything here is pure and deterministic.
 * Consumers (routes, CSV import, agents) import from here, never from a
 * deeper module.
 */

import type { Claim, EvidenceRow } from "../lib/types";
import { buildCoverage } from "./coverage";
import { buildFinding } from "./verdict";
import type { Finding } from "../lib/types";

export { buildCoverage, isInPopulation } from "./coverage";
export {
  applyFix,
  buildFinding,
  classifyFinding,
  computeVerdict,
  rank,
  saturationRung,
  selectBinding,
  sumTypes,
  toVerdictInput,
  wilson,
} from "./verdict";
export { explain } from "./explain";
export {
  EVIDENCE_LEVELS,
  FLOOR,
  LEVEL_LABELS,
  MIN_SUPPORT,
  THRESHOLDS,
  WILSON_Z,
  nextTarget,
  threshold,
} from "./thresholds";

/** The only composition the CLI and the API need. */
export function audit(
  evidence: readonly EvidenceRow[],
  claims: readonly Claim[],
): Finding[] {
  return claims
    .filter((claim) => claim.confirmed)
    .map((claim) => buildFinding(claim, buildCoverage(evidence, claim)));
}

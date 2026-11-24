/** Human labels for evidence levels. Safe for client components to import. */

import type { EvidenceLevel, EvidenceTypeName } from "./types";

export const LEVEL_LABELS: Readonly<Record<EvidenceLevel, EvidenceTypeName>> = {
  1: "internal",
  2: "stated",
  3: "concept",
  4: "commitment",
  5: "investment",
  6: "payment",
};

export function levelLabel(level: EvidenceLevel): EvidenceTypeName {
  return LEVEL_LABELS[level];
}

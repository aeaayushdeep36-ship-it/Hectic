/**
 * Every number that can move a verdict lives here, as data, with its kind and
 * its source. No number in this file was chosen by a language model.
 *
 * See research/03-engine-findings.md §4 for the rationale and the audit.
 */

import type { EvidenceLevel, EvidenceTypeName } from "../lib/types";

export interface EvidenceLevelDef {
  readonly level: EvidenceLevel;
  readonly code: EvidenceTypeName;
  readonly label: string;
  readonly description: string;
  readonly source: string;
}

export const EVIDENCE_LEVELS: readonly EvidenceLevelDef[] = [
  {
    level: 1,
    code: "internal",
    label: "internal",
    description: "Own-itch hypothesis or informal interest inside the company.",
    source: "Pattyn, Dillen & Goetz (2026), Computers 15(8):535",
  },
  {
    level: 2,
    code: "stated",
    label: "stated",
    description: "Structured stated evidence: discovery interviews, surveys.",
    source: "Pattyn, Dillen & Goetz (2026), Computers 15(8):535",
  },
  {
    level: 3,
    code: "concept",
    label: "concept",
    description: "Concept exposure without commitment: prototype, MVE, landing page.",
    source: "Pattyn, Dillen & Goetz (2026), Computers 15(8):535",
  },
  {
    level: 4,
    code: "commitment",
    label: "commitment",
    description: "Non-financial behavioural commitment: signup, waitlist, pilot, LOI.",
    source: "Pattyn, Dillen & Goetz (2026), Computers 15(8):535",
  },
  {
    level: 5,
    code: "investment",
    label: "investment",
    description: "Contingent investment commitment from an investor.",
    source: "Pattyn, Dillen & Goetz (2026), Computers 15(8):535",
  },
  {
    level: 6,
    code: "payment",
    label: "payment",
    description: "A paying customer before MVP.",
    source: "Pattyn, Dillen & Goetz (2026), Computers 15(8):535",
  },
];

export const LEVEL_LABELS: Readonly<Record<EvidenceLevel, EvidenceTypeName>> = {
  1: "internal",
  2: "stated",
  3: "concept",
  4: "commitment",
  5: "investment",
  6: "payment",
};

/** L1 is a floor, not a finding. The scale has no "zero evidence" rung. */
export const FLOOR: EvidenceLevel = 1;

export type ThresholdKind = "level" | "support" | "saturation" | "precision";

export interface ThresholdDef {
  readonly code: string;
  readonly kind: ThresholdKind;
  readonly scope: "theme" | "prevalence" | "all";
  readonly value: number;
  readonly rationale: string;
  readonly source: string;
}

export const THRESHOLDS: readonly ThresholdDef[] = [
  {
    code: "SATURATION_BASIC",
    kind: "saturation",
    scope: "theme",
    value: 6,
    rationale: "Basic elements of a theme appear by interview six.",
    source: "Guest, Bunce & Johnson (2006)",
  },
  {
    code: "SATURATION_CODE",
    kind: "saturation",
    scope: "theme",
    value: 12,
    rationale: "About 88% of themes are developed by interview twelve.",
    source: "Guest, Bunce & Johnson (2006); Hennink, Kaiser & Marconi (2017)",
  },
  {
    code: "SATURATION_MEANING",
    kind: "saturation",
    scope: "theme",
    value: 24,
    rationale: "Meaning saturation is reached between 16 and 24 interviews.",
    source: "Hennink, Kaiser & Marconi (2017)",
  },
  {
    code: "MIN_SUPPORT",
    kind: "support",
    scope: "all",
    value: 3,
    rationale: "A type resting on one or two organisations is an anecdote, not a pattern.",
    source: "Wilson & Lilien (1992), 104 buying-centre decisions",
  },
  {
    code: "WILSON_Z",
    kind: "precision",
    scope: "prevalence",
    value: 1.96,
    rationale: "Two-sided 95% normal quantile for the Wilson score interval.",
    source: "Wilson (1927); Newcombe (1998)",
  },
] as const;

export function threshold(code: string): ThresholdDef {
  const found = THRESHOLDS.find((t) => t.code === code);
  if (!found) throw new Error(`Unknown threshold: ${code}`);
  return found;
}

export const WILSON_Z = threshold("WILSON_Z").value;
export const MIN_SUPPORT = threshold("MIN_SUPPORT").value;

/**
 * L5 is contingent investor commitment: a different stakeholder, and Pattyn
 * notes that L6 makes it unnecessary. It never validates a customer claim.
 */
export function nextTarget(level: EvidenceLevel): EvidenceLevel {
  if (level === 4) return 6;
  if (level === 6) return 6;
  return (level + 1) as EvidenceLevel;
}

/**
 * Translation between the CSV/domain shape the engine consumes and the
 * privacy-shaped database schema. The engine never sees a real company name.
 */
import type { Claim, EvidenceRow, PopulationSpec, Relationship } from "../lib/types";
import type { ClaimRow, EvidenceRowDb } from "../db/schema";
import { LEVEL_LABELS } from "../engine/index";

const LEVEL_BY_CODE: Record<string, number> = {
  L1_internal: 1,
  L2_stated: 2,
  L3_concept: 3,
  L4_commitment: 4,
  L5_investment: 5,
  L6_payment: 6,
};

export function evidenceTypeToDb(level: number): string {
  return `L${level}_${LEVEL_LABELS[level as 1 | 2 | 3 | 4 | 5 | 6]}`;
}

export function evidenceTypeFromDb(code: string): number {
  const level = LEVEL_BY_CODE[code];
  if (level === undefined) throw new Error(`Unknown evidence type: ${code}`);
  return level;
}

export function channelToSource(channel: string): string {
  const value = channel.toLowerCase();
  if (value.includes("linkedin")) return "linkedin";
  if (value.includes("conference") || value.includes("event")) return "event";
  if (value.includes("panel")) return "panel";
  if (value.includes("inbound")) return "inbound";
  if (value.includes("community")) return "community";
  return "network";
}

export function relationshipToDb(relationship: Relationship): string {
  switch (relationship) {
    case "founder_network":
      return "friend";
    case "referral":
      return "acquaintance";
    case "cold":
      return "stranger";
    case "unknown":
      return "stranger";
  }
}

export function relationshipFromDb(value: string): Relationship {
  if (value === "stranger") return "cold";
  if (value === "acquaintance") return "referral";
  return "founder_network";
}

export function toEvidenceRow(row: EvidenceRowDb): EvidenceRow {
  return {
    id: row.id,
    orgId: row.orgRef,
    alias: row.alias,
    segment: row.segment,
    role: row.role as EvidenceRow["role"],
    channel: row.sourceChannel,
    relationship: relationshipFromDb(row.relationship),
    evidenceType: evidenceTypeFromDb(row.evidenceType) as EvidenceRow["evidenceType"],
    date: new Date(row.interviewedAt).toISOString().slice(0, 10),
    durationMin: row.durationMin,
    notes: row.notesRedacted ?? "",
  };
}

export function toClaim(row: ClaimRow): Claim {
  return {
    id: row.id,
    ordinal: row.ordinal,
    rawText: row.rawText,
    population: row.population,
    populationSpec: JSON.parse(row.populationSpec) as PopulationSpec,
    predicate: row.predicate,
    kind: row.kind as Claim["kind"],
    claimType: row.claimType as Claim["claimType"],
    claimedLevel: row.claimedLevel as Claim["claimedLevel"],
    observed:
      row.observedK !== null && row.observedN !== null
        ? { k: row.observedK, n: row.observedN }
        : null,
    precisionTolerance: row.precisionTolerance,
    confirmed: row.confirmedAt !== null,
  };
}

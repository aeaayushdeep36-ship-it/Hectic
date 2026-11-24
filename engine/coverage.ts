/**
 * Pure coverage arithmetic. No I/O, no clock, no randomness.
 *
 * The counting unit is the organisation. Eleven interviews from five
 * organisations are five units of evidence (Wilson & Lilien, 1992).
 */

import type {
  Claim,
  Coverage,
  CoverageCell,
  CoverageDiagnostics,
  EvidenceLevel,
  EvidenceRow,
  Role,
} from "../lib/types";

export function isInPopulation(row: EvidenceRow, claim: Claim): boolean {
  const segments = claim.populationSpec.segments;
  const roles = claim.populationSpec.roles;

  const segmentOk =
    !segments || segments.length === 0 || segments.includes(row.segment);
  const roleOk = !roles || roles.length === 0 || roles.includes(row.role);

  return segmentOk && roleOk;
}

interface OrgAccumulator {
  /** Strongest type across every row of this organisation. */
  maxLevelAll: EvidenceLevel;
  /** Strongest in-population type only; null until such evidence exists. */
  maxLevel: EvidenceLevel | null;
  inPopulation: boolean;
}

export function buildCoverage(
  evidence: readonly EvidenceRow[],
  claim: Claim,
): Coverage {
  const orgs = new Map<string, OrgAccumulator>();
  const segments = new Set<string>();
  const roles = new Set<Role>();
  const channelCounts: Record<string, number> = {};

  let networkRows = 0;
  let inPopulationNetworkRows = 0;
  let inPopulationRows = 0;

  for (const row of evidence) {
    segments.add(row.segment);
    roles.add(row.role);
    channelCounts[row.channel] = (channelCounts[row.channel] ?? 0) + 1;

    const inPopulation = isInPopulation(row, claim);
    if (inPopulation) inPopulationRows += 1;
    if (row.relationship === "founder_network") {
      networkRows += 1;
      if (inPopulation) inPopulationNetworkRows += 1;
    }

    const existing = orgs.get(row.orgId);
    if (!existing) {
      orgs.set(row.orgId, {
        maxLevelAll: row.evidenceType,
        maxLevel: inPopulation ? row.evidenceType : null,
        inPopulation,
      });
    } else {
      if (row.evidenceType > existing.maxLevelAll) {
        existing.maxLevelAll = row.evidenceType;
      }
      // An organisation's type is the strongest in-population evidence it has.
      if (
        inPopulation &&
        (existing.maxLevel === null || row.evidenceType > existing.maxLevel)
      ) {
        existing.maxLevel = row.evidenceType;
      }
      if (inPopulation) existing.inPopulation = true;
    }
  }

  const allOrgsByLevel: Partial<Record<EvidenceLevel, number>> = {};
  const orgsByLevel: Partial<Record<EvidenceLevel, number>> = {};
  let inPopulationOrgs = 0;

  for (const org of orgs.values()) {
    allOrgsByLevel[org.maxLevelAll] = (allOrgsByLevel[org.maxLevelAll] ?? 0) + 1;
    if (!org.inPopulation || org.maxLevel === null) continue;
    inPopulationOrgs += 1;
    orgsByLevel[org.maxLevel] = (orgsByLevel[org.maxLevel] ?? 0) + 1;
  }

  const matrix: CoverageCell[] = [];
  for (const segment of [...segments].sort()) {
    for (const role of [...roles].sort()) {
      const rowsInCell = evidence.filter(
        (row) => row.segment === segment && row.role === role,
      );
      if (rowsInCell.length === 0) continue;
      matrix.push({
        segment,
        role,
        rows: rowsInCell.length,
        orgs: new Set(rowsInCell.map((row) => row.orgId)).size,
      });
    }
  }

  const largestChannelCount = Math.max(0, ...Object.values(channelCounts));
  const diagnostics: CoverageDiagnostics = {
    channelCounts,
    largestChannelShare:
      evidence.length === 0 ? 0 : largestChannelCount / evidence.length,
    networkRows,
    networkShare: evidence.length === 0 ? 0 : networkRows / evidence.length,
    inPopulationNetworkRows,
  };

  return {
    totalRows: evidence.length,
    inPopulationRows,
    distinctOrgs: orgs.size,
    inPopulationOrgs,
    allOrgsByLevel,
    orgsByLevel,
    matrix,
    diagnostics,
  };
}

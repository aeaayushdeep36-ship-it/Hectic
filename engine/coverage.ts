/**
 * Pure coverage arithmetic. No I/O, no clock, no randomness.
 *
 * The counting unit is the organisation. Eleven interviews from five
 * organisations are five units of evidence (Wilson, Lilien & Wilson, 1991;
 * Wilson & Lilien, 1992).
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

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function isInPopulation(row: EvidenceRow, claim: Claim): boolean {
  const segments = claim.populationSpec.segments;
  const roles = claim.populationSpec.roles;

  const rowSegment = norm(row.segment);
  const rowRole = norm(row.role);

  const segmentOk =
    !segments ||
    segments.length === 0 ||
    segments.some((segment) => norm(segment) === rowSegment);
  const roleOk =
    !roles ||
    roles.length === 0 ||
    roles.some((role) => norm(role) === rowRole);

  return segmentOk && roleOk;
}

interface OrgAccumulator {
  /** Strongest type across every row of this organisation. */
  maxLevelAll: EvidenceLevel;
  /**
   * Strongest in-population supporting customer type (excluding L5 investor
   * commitments, which never validate a customer claim). Null until such
   * evidence exists.
   */
  maxCustomerLevel: EvidenceLevel | null;
  inPopulation: boolean;
  hasNetworkInPop: boolean;
  hasContradictionInPop: boolean;
  channelsInPop: Set<string>;
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

  const cellMap = new Map<
    string,
    { segment: string; role: Role; rows: number; orgIds: Set<string> }
  >();

  for (const row of evidence) {
    // F-06: When rows carry explicit claimIds, skip rows unrelated to this claim.
    if (row.claimIds && row.claimIds.length > 0 && !row.claimIds.includes(claim.id)) {
      continue;
    }

    segments.add(row.segment);
    roles.add(row.role);
    channelCounts[row.channel] = (channelCounts[row.channel] ?? 0) + 1;

    const cellKey = `${row.segment}\0${row.role}`;
    let cell = cellMap.get(cellKey);
    if (!cell) {
      cell = {
        segment: row.segment,
        role: row.role,
        rows: 0,
        orgIds: new Set<string>(),
      };
      cellMap.set(cellKey, cell);
    }
    cell.rows += 1;
    cell.orgIds.add(row.orgId);

    const inPopulation = isInPopulation(row, claim);
    const isContradiction = row.polarity === "contradicts";
    // F-01: L5 (contingent investor commitment) never validates a customer claim.
    const customerLevel =
      inPopulation && !isContradiction && row.evidenceType !== 5
        ? row.evidenceType
        : null;

    if (inPopulation) inPopulationRows += 1;
    if (row.relationship === "founder_network") {
      networkRows += 1;
      if (inPopulation) inPopulationNetworkRows += 1;
    }

    const existing = orgs.get(row.orgId);
    if (!existing) {
      const channelsInPop = new Set<string>();
      if (inPopulation) channelsInPop.add(row.channel);
      orgs.set(row.orgId, {
        maxLevelAll: row.evidenceType,
        maxCustomerLevel: customerLevel,
        inPopulation,
        hasNetworkInPop: inPopulation && row.relationship === "founder_network",
        hasContradictionInPop: inPopulation && isContradiction,
        channelsInPop,
      });
    } else {
      if (row.evidenceType > existing.maxLevelAll) {
        existing.maxLevelAll = row.evidenceType;
      }
      if (
        customerLevel !== null &&
        (existing.maxCustomerLevel === null ||
          customerLevel > existing.maxCustomerLevel)
      ) {
        existing.maxCustomerLevel = customerLevel;
      }
      if (inPopulation) {
        existing.inPopulation = true;
        existing.channelsInPop.add(row.channel);
        if (row.relationship === "founder_network") existing.hasNetworkInPop = true;
        if (isContradiction) existing.hasContradictionInPop = true;
      }
    }
  }

  // F-05: Ensure declared target cells in populationSpec appear even with 0 orgs.
  const declaredSegments = claim.populationSpec.segments ?? [];
  const declaredRoles = claim.populationSpec.roles ?? [];
  for (const seg of declaredSegments) segments.add(seg);
  for (const role of declaredRoles) roles.add(role);

  const allOrgsByLevel: Partial<Record<EvidenceLevel, number>> = {};
  const orgsByLevel: Partial<Record<EvidenceLevel, number>> = {};
  let inPopulationOrgs = 0;
  let inPopulationNetworkOrgs = 0;
  let contradictingOrgs = 0;
  const channelOrgCounts: Record<string, number> = {};

  for (const org of orgs.values()) {
    allOrgsByLevel[org.maxLevelAll] = (allOrgsByLevel[org.maxLevelAll] ?? 0) + 1;
    if (!org.inPopulation) continue;
    if (org.hasNetworkInPop) inPopulationNetworkOrgs += 1;
    if (org.hasContradictionInPop) contradictingOrgs += 1;
    for (const ch of org.channelsInPop) {
      channelOrgCounts[ch] = (channelOrgCounts[ch] ?? 0) + 1;
    }
    if (org.maxCustomerLevel === null) continue;
    inPopulationOrgs += 1;
    orgsByLevel[org.maxCustomerLevel] =
      (orgsByLevel[org.maxCustomerLevel] ?? 0) + 1;
  }

  const matrix: CoverageCell[] = [];
  const declaredSegmentSet = new Set(declaredSegments.map(norm));
  const declaredRoleSet = new Set(declaredRoles.map(norm));

  for (const segment of [...segments].sort()) {
    for (const role of [...roles].sort()) {
      const cell = cellMap.get(`${segment}\0${role}`);
      const isDeclaredTarget =
        (declaredSegmentSet.size === 0 || declaredSegmentSet.has(norm(segment))) &&
        (declaredRoleSet.size === 0 || declaredRoleSet.has(norm(role))) &&
        (declaredSegmentSet.size > 0 || declaredRoleSet.size > 0);

      if (!cell) {
        if (isDeclaredTarget) {
          matrix.push({ segment, role, rows: 0, orgs: 0 });
        }
        continue;
      }
      matrix.push({
        segment,
        role,
        rows: cell.rows,
        orgs: cell.orgIds.size,
      });
    }
  }

  const largestChannelCount = Math.max(0, ...Object.values(channelCounts));
  const largestChannelOrgCount = Math.max(0, ...Object.values(channelOrgCounts));
  const totalInPopOrgs = Math.max(inPopulationOrgs, contradictingOrgs);

  const diagnostics: CoverageDiagnostics = {
    channelCounts,
    largestChannelShare:
      evidence.length === 0 ? 0 : largestChannelCount / evidence.length,
    networkRows,
    networkShare: evidence.length === 0 ? 0 : networkRows / evidence.length,
    inPopulationNetworkRows,
    inPopulationNetworkOrgs,
    networkOrgShare:
      totalInPopOrgs === 0 ? 0 : inPopulationNetworkOrgs / totalInPopOrgs,
    largestChannelOrgShare:
      totalInPopOrgs === 0 ? 0 : largestChannelOrgCount / totalInPopOrgs,
    contradictingOrgs,
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

/**
 * Value-of-Information ranker (Lakens, 2022): returns target cells ordered by
 * fewest independent organisations so +1 interview yields maximum information gain.
 */
export function recommendNextCells(
  coverage: Coverage,
  claim: Claim,
): readonly CoverageCell[] {
  return coverage.matrix
    .filter((cell) => {
      const segments = claim.populationSpec.segments;
      const roles = claim.populationSpec.roles;
      const segOk =
        !segments ||
        segments.length === 0 ||
        segments.some((s) => norm(s) === norm(cell.segment));
      const roleOk =
        !roles ||
        roles.length === 0 ||
        roles.some((r) => norm(r) === norm(cell.role));
      return segOk && roleOk;
    })
    .sort((a, b) => a.orgs - b.orgs || a.rows - b.rows);
}

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  applyFix,
  buildCoverage,
  computeVerdict,
  nextTarget,
  rank,
  saturationRung,
  wilson,
} from "../engine/index";
import type {
  Claim,
  ClaimType,
  EvidenceLevel,
  EvidenceRow,
  VerdictInput,
} from "../lib/types";

const claim = (overrides: Partial<Claim> = {}): Claim => ({
  id: "c",
  ordinal: 0,
  rawText: "test claim",
  population: "everyone",
  populationSpec: {},
  predicate: "x",
  kind: "pain",
  claimType: "theme",
  claimedLevel: 6,
  observed: null,
  precisionTolerance: null,
  confirmed: true,
  ...overrides,
});

const row = (overrides: Partial<EvidenceRow> = {}): EvidenceRow => ({
  id: "r",
  orgId: "o1",
  alias: "P1",
  segment: "S",
  role: "user",
  channel: "c",
  relationship: "cold",
  evidenceType: 2,
  date: "2026-01-01",
  durationMin: 20,
  notes: "",
  ...overrides,
});

const countArb = fc.tuple(
  fc.nat({ max: 6 }),
  fc.nat({ max: 6 }),
  fc.nat({ max: 6 }),
  fc.nat({ max: 6 }),
  fc.nat({ max: 6 }),
  fc.nat({ max: 6 }),
);

function toCounts(counts: readonly number[]): Partial<Record<EvidenceLevel, number>> {
  const result: Partial<Record<EvidenceLevel, number>> = {};
  counts.forEach((count, index) => {
    if (count > 0) result[(index + 1) as EvidenceLevel] = count;
  });
  return result;
}

const inputArb: fc.Arbitrary<VerdictInput> = fc
  .record({
    counts: countArb,
    inPopulationTenths: fc.nat({ max: 10 }),
    claimType: fc.constantFrom<ClaimType>("theme", "prevalence"),
  })
  .map(({ counts, inPopulationTenths, claimType }) => {
    const inPopCounts = counts.map((count) =>
      Math.floor((count * inPopulationTenths) / 10),
    );
    return {
      types: toCounts(counts),
      inPopulationTypes: toCounts(inPopCounts),
      inPopulationOrgs: inPopCounts.reduce((sum, count) => sum + count, 0),
      claimType,
      observed: null,
    };
  });

describe("thresholds and arithmetic", () => {
  it("computes the documented Wilson intervals", () => {
    expect(wilson(3, 3)).toEqual([0.44, 1, 0.56]);
    expect(wilson(1, 1)).toEqual([0.21, 1, 0.79]);
    expect(wilson(0, 0)).toEqual([0, 1, 1]);
  });

  it("places the saturation rungs at the cited breakpoints", () => {
    expect(saturationRung(5)).toBe("insufficient");
    expect(saturationRung(6)).toBe("basic");
    expect(saturationRung(12)).toBe("code");
    expect(saturationRung(24)).toBe("meaning");
  });

  it("skips L5 as a customer target from L4", () => {
    expect(nextTarget(4)).toBe(6);
    expect(nextTarget(5)).toBe(6);
    expect(nextTarget(2)).toBe(3);
  });
});

describe("the population gate", () => {
  it("cannot manufacture a level from out-of-population evidence", () => {
    const coverage = buildCoverage([row({ evidenceType: 6 })], claim({
      populationSpec: { roles: ["economic"] },
    }));
    const verdict = computeVerdict({
      claimType: "theme",
      observed: null,
      types: coverage.allOrgsByLevel,
      inPopulationTypes: coverage.orgsByLevel,
      inPopulationOrgs: coverage.inPopulationOrgs,
    });
    expect(verdict).toMatchObject({ level: 1, support: 0, breadth: 0, binding: "population" });
  });
});

describe("the counting unit", () => {
  it("never counts two informants at one organisation twice", () => {
    const rows = [
      row({ id: "a", orgId: "o1" }),
      row({ id: "b", orgId: "o1", alias: "P2" }),
      row({ id: "c", orgId: "o2", alias: "P3" }),
    ];
    const coverage = buildCoverage(rows, claim());
    expect(coverage.totalRows).toBe(3);
    expect(coverage.distinctOrgs).toBe(2);
    expect(coverage.inPopulationOrgs).toBe(2);
  });

  it("takes the strongest in-population type per organisation", () => {
    const rows = [
      row({ id: "a", orgId: "o1", evidenceType: 2 }),
      row({ id: "b", orgId: "o1", evidenceType: 6 }),
    ];
    const coverage = buildCoverage(rows, claim());
    expect(coverage.orgsByLevel).toEqual({ 6: 1 });
  });
});

describe("properties", () => {
  it("actionability — applying the named fix always raises the verdict", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const verdict = computeVerdict(input);
        if (verdict.binding === null) return true;
        const fixed = computeVerdict(applyFix(input, verdict));
        return cmp(rank(fixed), rank(verdict)) > 0;
      }),
      { numRuns: 500, seed: 20261124 },
    );
  });

  it("monotonicity — adding evidence never lowers the verdict", () => {
    fc.assert(
      fc.property(inputArb, fc.constantFrom(1, 2, 3, 4, 5, 6), (input, level) => {
        const base = computeVerdict(input);
        const types = { ...input.types, [level]: (input.types[level] ?? 0) + 1 };
        const inPopulationTypes = {
          ...input.inPopulationTypes,
          [level]: (input.inPopulationTypes[level] ?? 0) + 1,
        };
        const more = computeVerdict({
          ...input,
          types,
          inPopulationTypes,
          inPopulationOrgs: input.inPopulationOrgs + 1,
        });
        return cmp(rank(more), rank(base)) >= 0;
      }),
      { numRuns: 500, seed: 20261124 },
    );
  });

  it("the level is never manufactured from an absent type", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const verdict = computeVerdict(input);
        const customerEntries = Object.entries(input.inPopulationTypes).filter(
          ([level, count]) => Number(level) !== 5 && (count ?? 0) > 0,
        );
        if (input.inPopulationOrgs === 0 || customerEntries.length === 0) {
          return verdict.level === 1 && verdict.support === 0;
        }
        const max = Math.max(0, ...customerEntries.map(([level]) => Number(level)));
        return verdict.level === max;
      }),
      { numRuns: 500, seed: 20261124 },
    );
  });

  it("support and breadth mean what they say", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const verdict = computeVerdict(input);
        const customerEntries = Object.entries(input.inPopulationTypes).filter(
          ([level, count]) => Number(level) !== 5 && (count ?? 0) > 0,
        );
        if (input.inPopulationOrgs === 0 || customerEntries.length === 0) {
          return verdict.support === 0 && verdict.breadth === 0;
        }
        const atLevel = input.inPopulationTypes[verdict.level] ?? 0;
        const total = customerEntries.reduce<number>(
          (sum, [, count]) => sum + (count ?? 0),
          0,
        );
        return verdict.support === atLevel && verdict.breadth === total;
      }),
      { numRuns: 500, seed: 20261124 },
    );
  });
});

function cmp(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  for (let i = 0; i < a.length; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  }
  return 0;
}

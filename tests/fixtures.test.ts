import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { audit } from "../engine/index";
import { verdictHash } from "../lib/hash";
import { parseRoster } from "../lib/csv";
import { claimsFileSchema } from "../lib/schemas";

const fixtures = [
  "clean",
  "underpowered",
  "wrong-population",
  "ambiguous",
] as const;

function load(name: string) {
  const dir = path.join("fixtures", name);
  const { rows, errors } = parseRoster(
    readFileSync(path.join(dir, "roster.csv"), "utf8"),
  );
  expect(errors).toEqual([]);
  const claims = claimsFileSchema.parse(
    JSON.parse(readFileSync(path.join(dir, "claims.json"), "utf8")),
  );
  return { rows, claims };
}

describe("golden fixtures — the day-3 gate", () => {
  for (const name of fixtures) {
    it(`${name} matches its hand computation exactly`, () => {
      const { rows, claims } = load(name);
      const findings = audit(rows, claims);
      const expected = JSON.parse(
        readFileSync(path.join("fixtures", name, "expected.json"), "utf8"),
      );

      const verdicts = findings.map((finding) => ({
        claimId: finding.claimId,
        claimType: claims.find((claim) => claim.id === finding.claimId)?.claimType,
        claimed: finding.claimed,
        level: finding.verdict.level,
        support: finding.verdict.support,
        breadth: finding.verdict.breadth,
        saturation: finding.verdict.saturation,
        interval: finding.verdict.interval,
        finding: finding.kind,
        binding: finding.verdict.binding,
      }));

      expect(verdicts).toEqual(expected.verdicts);
      expect(verdictHash(findings)).toBe(expected.verdictHash);
    });
  }

  it("is order-independent: permuting the roster changes nothing", () => {
    const { rows, claims } = load("ambiguous");
    expect(audit([...rows].reverse(), claims)).toEqual(audit(rows, claims));
  });
});

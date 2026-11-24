/**
 * Authoring aid, not a test oracle generator. It prints the engine output so
 * the numbers can be checked by hand against each fixture README before they
 * are written into expected.json.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseRoster } from "../lib/csv";
import { claimsFileSchema } from "../lib/schemas";
import { audit } from "../engine/index";
import { verdictHash } from "../lib/hash";

const names = ["clean", "underpowered", "wrong-population", "ambiguous"];

for (const name of names) {
  const dir = path.join("fixtures", name);
  const { rows, errors } = parseRoster(
    readFileSync(path.join(dir, "roster.csv"), "utf8"),
  );
  const claims = claimsFileSchema.parse(
    JSON.parse(readFileSync(path.join(dir, "claims.json"), "utf8")),
  );
  const findings = audit(rows, claims);

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

  console.log(
    JSON.stringify(
      { fixture: name, verdicts, verdictHash: verdictHash(findings) },
      null,
      2,
    ),
  );
  if (errors.length > 0) console.error(name, errors);
}

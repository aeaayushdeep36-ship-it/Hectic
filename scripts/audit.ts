/**
 * The vertical-slice CLI: roster.csv + claims.json -> verdicts on stdout.
 * No model, no database, no UI — the engine in its purest usable form.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { audit, explain } from "../engine/index";
import { parseRoster } from "../lib/csv";
import { claimsFileSchema } from "../lib/schemas";
import { verdictHash } from "../lib/hash";

const { values } = parseArgs({
  options: {
    roster: { type: "string" },
    claims: { type: "string" },
  },
  strict: true,
});

if (!values.roster || !values.claims) {
  console.error(
    "Usage: npm run audit -- --roster fixtures/clean/roster.csv --claims fixtures/clean/claims.json",
  );
  process.exit(2);
}

const { rows, errors } = parseRoster(readFileSync(values.roster, "utf8"));
if (errors.length > 0) {
  console.error("Roster errors:");
  for (const error of errors) console.error(`  line ${error.line}: ${error.message}`);
  process.exit(1);
}

const claims = claimsFileSchema.parse(
  JSON.parse(readFileSync(values.claims, "utf8")),
);
const findings = audit(rows, claims);

for (const finding of findings) {
  const claim = claims.find((candidate) => candidate.id === finding.claimId);
  if (!claim) continue;
  console.log(
    `${finding.claimId}: L${finding.verdict.level} · ${finding.verdict.support} orgs  ${finding.kind}`,
  );
  console.log(`  ${explain(claim, finding)}`);
}

console.log(`\n${verdictHash(findings)}`);

// A second, explicit guard beside the ESLint restricted-import rule.
// Fails loudly if engine/ ever reaches for I/O, a provider, or the UI.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BANNED = [
  "react",
  "next/",
  "drizzle-orm",
  "better-sqlite3",
  "node:fs",
  "from \"fs\"",
  "node:http",
  "node:https",
  "fetch(",
  "papaparse",
  "Math.random",
  "Date.now",
];

const dir = "engine";
const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
const hits = [];

for (const file of files) {
  const text = readFileSync(join(dir, file), "utf8");
  for (const token of BANNED) {
    if (text.includes(token)) hits.push(`${dir}/${file}: ${token}`);
  }
}

if (hits.length > 0) {
  console.error("engine/ purity violation:");
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}

console.log(`engine/ boundary OK (${files.length} pure modules)`);

/**
 * Minimal .env.local loader for standalone scripts. Next.js loads this file for
 * the app itself; tsx scripts do not, so the live gate loads it explicitly.
 * Existing process environment values always win, and nothing is logged.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function loadEnvLocal(file = path.join(process.cwd(), ".env.local")): void {
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const assignment = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed;
    const separator = assignment.indexOf("=");
    if (separator <= 0) continue;

    const key = assignment.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;

    const rawValue = assignment.slice(separator + 1).trim();
    const quoted =
      rawValue.length >= 2 &&
      ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'")));
    process.env[key] = quoted ? rawValue.slice(1, -1) : rawValue;
  }
}

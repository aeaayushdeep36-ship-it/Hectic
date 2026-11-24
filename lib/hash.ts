import { createHash } from "node:crypto";

/** Stable across key insertion order, so the hash is a real determinism check. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}

export function verdictHash(findings: unknown): string {
  const digest = createHash("sha256")
    .update(stableStringify(findings))
    .digest("hex")
    .slice(0, 16);
  return `sha256:${digest}`;
}

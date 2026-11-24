/**
 * G1 — input guard. Runs before any provider call.
 * Person names are deliberately NOT detected; see docs/04-security.md §5.
 */

export interface GuardResult {
  readonly redacted: string;
  readonly flags: readonly string[];
  readonly injected: boolean;
}

const PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: "EMAIL", re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/g },
  { name: "PHONE", re: /(\+\d[\d\s().-]{7,}\d)/g },
  { name: "IBAN", re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { name: "URL", re: /https?:\/\/\S+/g },
];

const INJECTION = [
  "ignore previous",
  "disregard",
  "you are now",
  "system:",
  "override",
  "mark all",
  "return true",
  "return verdict",
  "forget rules",
  "forget previous",
  "new instructions",
  '"}',
  "\\n\\nHuman:",
];

export function guard(input: string): GuardResult {
  let redacted = input;
  const flags: string[] = [];

  for (const pattern of PATTERNS) {
    if (pattern.re.test(redacted)) {
      redacted = redacted.replace(pattern.re, `[${pattern.name}]`);
      flags.push(pattern.name);
    }
  }

  // Strip spreadsheet formula prefixes at the start of any cell/line.
  const withoutFormulas = redacted.replace(/(^|[\n,])\s*[=+\-@\t]/g, "$1 ");
  if (withoutFormulas !== redacted) {
    flags.push("FORMULA");
    redacted = withoutFormulas;
  }

  const lower = input.toLowerCase();
  for (const needle of INJECTION) {
    if (lower.includes(needle)) {
      flags.push(`INJECTION:${needle}`);
    }
  }

  return {
    redacted,
    flags,
    injected: flags.some((flag) => flag.startsWith("INJECTION:")),
  };
}

/** React escaping is the output control; this is defence in depth for exports. */
export function safeText(input: string): string {
  return guard(input).redacted;
}

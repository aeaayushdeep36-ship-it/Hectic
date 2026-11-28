/**
 * Fail if a real-looking provider key is present in any tracked or untracked,
 * non-ignored file. `.env.local` is ignored by git and is intentionally absent
 * from `git ls-files --others --exclude-standard`.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  { name: "OpenRouter", re: /sk-or-v1-[A-Za-z0-9_-]{16,}/g },
  { name: "OpenAI-style", re: /sk-[A-Za-z0-9_-]{20,}/g },
  { name: "Google", re: /AIza[0-9A-Za-z_-]{20,}/g },
  { name: "Groq", re: /gsk_[A-Za-z0-9]{20,}/g },
  { name: "Slack", re: /xoxb-[0-9A-Za-z-]{20,}/g },
  // Newer Google API key format (starts with "AQ."); the AIza pattern misses it.
  { name: "Google (AQ.)", re: /\bAQ\.[A-Za-z0-9_-]{30,}/g },
];

const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
  windowsHide: true,
});
const files = listed.split(/\r?\n/).filter(Boolean);
const findings = [];

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.includes("\u0000")) continue;
  for (const pattern of PATTERNS) {
    pattern.re.lastIndex = 0;
    if (pattern.re.test(text)) findings.push(`${file}: ${pattern.name}-shaped value`);
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed:");
  for (const finding of findings) console.error(`  ${finding}`);
  process.exit(1);
}

console.log(`Secret scan OK (${files.length} tracked/untracked files; .env.local is ignored).`);

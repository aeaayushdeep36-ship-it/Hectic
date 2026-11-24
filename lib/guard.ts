/**
 * G1 — input guard. Runs before storage and before any provider call.
 *
 * Person names are a GDPR risk here: interviewees never consented to AI
 * processing. The detector is deliberately conservative. It redacts a pair of
 * capitalised tokens (with optional title or particles), and it never guesses
 * from a single capitalised word — that would turn "Most managers" into PII.
 * The known residual gap (single-token names, non-Latin scripts without a
 * second token) is disclosed in RESPONSIBLE_AI.md.
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

/** Words that look like a name pair but are ordinary prose in this domain. */
const NAME_STOPWORDS = new Set([
  "a", "an", "the", "this", "that", "these", "those", "it", "its", "they",
  "their", "he", "she", "we", "you", "your", "our", "my", "no", "not",
  "most", "many", "some", "all", "every", "each", "one", "two", "three",
  "four", "five", "twelve", "twenty", "first", "second", "third", "next",
  "last", "new", "old", "good", "bad", "best", "worse", "loved", "liked",
  "reach", "email", "emailed", "spoke", "said", "says", "told", "asked",
  "ignore", "disregard", "forget", "override", "return", "mark", "system",
  "human", "human:", "silence", "politeness", "budget", "dental", "legal",
  "clinic", "clinics", "practice", "practices", "manager", "managers",
  "founder", "founders", "buyer", "buyers", "engineer", "engineers",
  "doctor", "doctors", "dentist", "dentists", "nurse", "nurses", "teacher",
  "teachers", "user", "users", "owner", "owners", "people", "practice",
  "german", "european", "french", "american", "british", "italian",
  "spanish", "indian", "linkedin", "linked", "conference", "pricing",
  "price", "payment", "follow", "follow-up", "recurring", "problem",
  "product", "pilot", "letter", "intent", "commitment", "investment",
  "rework", "market", "startup", "startups", "saturation", "wilson",
  "pattyn", "dillen", "goetz", "guest", "bunce", "johnson", "hennink",
  "kaiser", "segment", "segments", "retail", "healthcare", "unconfirmed",
  "unsupported", "supported", "insufficient", "imprecise", "ambiguous",
  "support", "precision", "binding", "export", "draft", "verified",
]);

const NAME_PARTICLES = new Set([
  "van", "von", "de", "del", "della", "der", "den", "la", "le", "bin",
  "ibn", "al", "st", "st.", "mc", "da", "dos", "du", "di", "ten", "ter",
]);

const NAME_TITLES = new Set(["mr", "mr.", "mrs", "mrs.", "ms", "ms.", "miss", "dr", "dr.", "prof", "prof.", "professor"]);

interface Token {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

function tokensOf(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(/[\p{L}][\p{L}'’-]*/gu)) {
    tokens.push({
      text: match[0],
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    });
  }
  return tokens;
}

function isNameToken(token: Token | undefined): token is Token {
  if (!token || token.text.length < 2) return false;
  if (NAME_STOPWORDS.has(token.text.toLowerCase())) return false;
  if (!/^\p{Lu}/u.test(token.text)) return false;
  // Acronyms such as SMB, GDPR and L6 are not personal names.
  if (token.text === token.text.toUpperCase()) return false;
  return /[\p{Ll}]/u.test(token.text.slice(1));
}

/**
 * Finds spans that are very likely to be person names. Requires two adjacent
 * capitalised tokens, or a title followed by one. Single capitalised words and
 * sentence starters are deliberately left alone.
 */
function nameSpans(text: string): Token[] {
  const tokens = tokensOf(text);
  const spans: Token[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const lower = token.text.toLowerCase();

    if (NAME_TITLES.has(lower)) {
      const first = tokens[index + 1];
      if (isNameToken(first)) {
        let cursor = index + 2;
        let end = first;
        while (tokens[cursor] && NAME_PARTICLES.has(tokens[cursor]!.text.toLowerCase())) {
          cursor += 1;
        }
        const second = tokens[cursor];
        if (isNameToken(second)) {
          end = second;
          index = cursor;
        } else {
          index += 1;
        }
        spans.push({ text: text.slice(token.start, end.end), start: token.start, end: end.end });
        continue;
      }
    }

    if (!isNameToken(token)) continue;
    let cursor = index + 1;
    while (tokens[cursor] && NAME_PARTICLES.has(tokens[cursor]!.text.toLowerCase())) {
      cursor += 1;
    }
    const next = tokens[cursor];
    if (isNameToken(next)) {
      spans.push({ text: text.slice(token.start, next.end), start: token.start, end: next.end });
      index = cursor;
    }
  }

  return spans;
}

function redactNames(text: string): { redacted: string; found: boolean } {
  const spans = nameSpans(text);
  if (spans.length === 0) return { redacted: text, found: false };
  let redacted = text;
  for (const span of [...spans].reverse()) {
    redacted = `${redacted.slice(0, span.start)}[NAME]${redacted.slice(span.end)}`;
  }
  return { redacted, found: true };
}

export function guard(input: string): GuardResult {
  let redacted = input;
  const flags: string[] = [];

  for (const pattern of PATTERNS) {
    if (pattern.re.test(redacted)) {
      redacted = redacted.replace(pattern.re, `[${pattern.name}]`);
      flags.push(pattern.name);
    }
  }

  const names = redactNames(redacted);
  if (names.found) {
    redacted = names.redacted;
    flags.push("NAME");
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

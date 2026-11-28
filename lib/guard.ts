/**
 * G1 — input guard. Runs before storage and before any provider call.
 *
 * Person names are a GDPR risk here: interviewees never consented to AI
 * processing. The detector aliases a pair of capitalised tokens (with optional
 * title or particles), plus single names that appear in a naming context such
 * as "Priya said X" or "name: adi". It refuses to alias role prose such as
 * "Most managers said X" or acronyms such as GDPR. Emails, phones, IBANs, card
 * numbers and URLs are redacted before names are scanned.
 */

export interface GuardResult {
  readonly redacted: string;
  readonly flags: readonly string[];
  readonly injected: boolean;
}

interface PatternSpec {
  readonly name: string;
  readonly re: RegExp;
  /** Optional extra check on the matched text (for example a Luhn checksum). */
  readonly accept?: (match: string) => boolean;
}

/** Luhn checksum, so ordinary long numbers are not mistaken for card numbers. */
function passesLuhn(candidate: string): boolean {
  const digits = candidate.replace(/\D/gu, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = Number(digits[index]);
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

const PATTERNS: ReadonlyArray<PatternSpec> = [
  { name: "EMAIL", re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/giu },
  {
    // "jane [at] acme [dot] com" and "jane at acme dot com".
    name: "EMAIL",
    re: /\b[\w.+-]+\s*(?:\[at\]|\(at\)|\sat\s)\s*[\w-]+\s*(?:\[dot\]|\(dot\)|\sdot\s)\s*[a-z]{2,}\b/giu,
  },
  {
    name: "IBAN",
    // Case-insensitive and space-tolerant: BE68 5390 0754 7034 and
    // be68539007547034 are both covered. Run before PHONE so its digit groups
    // cannot be mistaken for a telephone number.
    re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){10,30}\b/giu,
  },
  {
    // 13–19 digits with optional space/hyphen separators, confirmed by Luhn.
    // Must run before PHONE, which would otherwise eat the first groups.
    name: "CARD",
    re: /(?<![\p{L}\d])(?:\d[ -]?){12,18}\d(?!\d)/gu,
    accept: passesLuhn,
  },
  {
    name: "PHONE",
    // International or national numbers with separated groups. The lookbehind
    // prevents a match inside an alphanumeric code (for example an IBAN).
    re: /(?<![\p{L}\d])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{2,4}[\s.-])\d{3,4}[\s.-]\d{3,4}/giu,
  },
  {
    // French numbers: 06 12 34 56 78, 06.12.34.56.78, 0612345678, +33 6 12 34 56 78.
    name: "PHONE",
    re: /(?<![\p{L}\d])(?:\+33|0033|0)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}(?!\d)/gu,
  },
  {
    // Any other international number: +49 30 1234567, +447911123456.
    name: "PHONE",
    re: /(?<![\p{L}\d])\+\d{1,3}(?:[\s.-]?\d{1,4}){2,6}(?!\d)/gu,
  },
  { name: "URL", re: /https?:\/\/\S+/giu },
  {
    // Scheme-less links that identify a person: www.* and social profiles.
    name: "URL",
    re: /(?<![\w@.])(?:www\.[\w-]+\.\S+|(?:[\w-]+\.)?(?:linkedin|twitter|facebook|instagram)\.com\/\S*|x\.com\/\S+)/giu,
  },
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
  "rework", "market", "startup", "startups", "saturation", "segment",
  "segments", "retail", "healthcare", "unconfirmed",
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

interface Span {
  readonly start: number;
  readonly end: number;
}

/**
 * Single-token names are only aliased when the surrounding prose says the word
 * is a person. Role nouns stay in the stop-list, so "Most managers said X" and
 * "GDPR and SMB buyers said X" remain untouched while "Priya said X" and
 * "name: adi" are aliased.
 */
const NAME_CONTEXT_PATTERNS: readonly RegExp[] = [
  /\b(?<name>[A-Z][\p{L}'’-]+)(?=\s+(?:said|says|told|asked|mentioned|described|reported|explained|confirmed|agreed|added|observed))\b/gu,
  /\b(?:called|named|from|with|by|for|met|interviewed|contacted)\s+(?<name>[A-Z][\p{L}'’-]+)(?!\s+\p{Ll})/gu,
  /\b(?:name|contact|person|participant|interviewee|attendee)\s*[:=]\s*(?<name>[\p{L}][\p{L}'’-]+(?:\s+[\p{L}][\p{L}'’-]+){0,1})\b/giu,
  /\b(?:called|named)\s+(?<name>[\p{L}][\p{L}'’-]+)\b/giu,
  /\b(?<name>[\p{L}][\p{L}'’-]+)\s+(?:said|says|told|asked|mentioned|described|reported|explained|confirmed|agreed|added|observed)\b/giu,
];

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

function isNameWord(word: string): boolean {
  const clean = word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  if (clean.length < 2) return false;
  if (NAME_STOPWORDS.has(clean.toLowerCase())) return false;
  // Acronyms such as SMB, GDPR and L6 are not personal names.
  if (clean === clean.toUpperCase()) return false;
  return true;
}

function isNameToken(token: Token | undefined): token is Token {
  if (!token || !isNameWord(token.text)) return false;
  if (!/^\p{Lu}/u.test(token.text)) return false;
  return /[\p{Ll}]/u.test(token.text.slice(1));
}

/** Two adjacent capitalised tokens, or a title followed by one. */
function namePairSpans(text: string): Span[] {
  const tokens = tokensOf(text);
  const spans: Span[] = [];

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
        spans.push({ start: token.start, end: end.end });
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
      spans.push({ start: token.start, end: next.end });
      index = cursor;
    }
  }

  return spans;
}

function nameContextSpans(text: string): Span[] {
  const spans: Span[] = [];
  for (const pattern of NAME_CONTEXT_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const name = match.groups?.name;
      if (!name) continue;
      const words = name.split(/\s+/u);
      if (!words.some(isNameWord) || words.every((word) => NAME_STOPWORDS.has(word.toLowerCase()))) {
        continue;
      }
      const start = (match.index ?? 0) + match[0].indexOf(name);
      spans.push({ start, end: start + name.length });
    }
  }
  return spans;
}

function mergeSpans(spans: readonly Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Span[] = [];
  for (const span of sorted) {
    const last = merged.at(-1);
    if (!last || span.start > last.end) {
      merged.push(span);
      continue;
    }
    merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, span.end) };
  }
  return merged;
}

function redactNames(text: string): { redacted: string; found: boolean } {
  const spans = mergeSpans([...namePairSpans(text), ...nameContextSpans(text)]);
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
    pattern.re.lastIndex = 0;
    const next = redacted.replace(pattern.re, (match) =>
      pattern.accept && !pattern.accept(match) ? match : `[${pattern.name}]`,
    );
    if (next !== redacted) {
      redacted = next;
      if (!flags.includes(pattern.name)) flags.push(pattern.name);
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

  // Collapse whitespace so "ignore   previous" matches the same needle.
  const lower = input.toLowerCase().replace(/\s+/gu, " ");
  for (const needle of INJECTION) {
    if (lower.includes(needle.toLowerCase().replace(/\s+/gu, " "))) {
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

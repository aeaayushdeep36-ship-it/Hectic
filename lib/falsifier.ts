/**
 * E5 — a falsifier is a testable observation, not a condition word plus prose.
 *
 * Shared by the UI and the server so the same rule is enforced in both places.
 * Requires:
 *   1. A condition or comparator (if, when, unless, should, fewer than, etc.)
 *   2. A numeric threshold or percentage (e.g. 3 of 5, 10%, $50)
 *   3. An observable outcome verb or stakeholder/commitment unit (never a bare
 *      time duration such as "in 2 weeks").
 */
export interface FalsifierCheck {
  readonly ok: boolean;
  readonly reason: string | null;
}

const CONDITION = /\b(if|when|unless|should)\b/i;
const QUANTITY = /(?:\d+(?:\.\d+)?\s*(?:%|percent)\b|(?:[$€£]\s*\d+|\b\d+(?:\.\d+)?\b))/i;
const OUTCOME_OR_UNIT =
  /\b(convert(?:s|ed|ing)?|conversion|churn(?:s|ed|ing)?|sign(?:s|ed|ing)?|pay(?:s|ing)?|paid|prepay(?:s|ing)?|commit(?:s|ted|ting)?|refuse(?:s|d)?|decline(?:s|d)?|drop(?:s|ped)?|fail(?:s|ed)?|adopt(?:s|ed)?|renew(?:s|ed)?|respond(?:s|ed)?|book(?:s|ed)?|cancel(?:s|led)?|leave(?:s)?|say(?:s)?|said|interviews?|organi[sz]ations?|managers?|buyers?|users?|customers?|companies|teams?|accounts?|pilots?|prepayments?|contracts?|lois?)\b|%/i;

export function checkFalsifier(value: string): FalsifierCheck {
  const text = value.trim();
  const hasMeasurableOutcome = QUANTITY.test(text) && OUTCOME_OR_UNIT.test(text);

  // A short but genuinely measurable observation is stronger than forty
  // characters of prose. The 40-character floor applies only to vague text.
  if (text.length < 40 && !hasMeasurableOutcome) {
    return { ok: false, reason: "A falsifier must be at least 40 characters." };
  }
  if (!CONDITION.test(text)) {
    return { ok: false, reason: "Name the condition: if, when, unless or should." };
  }
  if (!hasMeasurableOutcome) {
    return { ok: false, reason: "FALSIFIER_NOT_OBSERVABLE: include a measurable outcome." };
  }
  return { ok: true, reason: null };
}

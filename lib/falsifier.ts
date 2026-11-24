/**
 * E5 — a falsifier is a testable observation, not a condition word plus prose.
 *
 * Shared by the UI and the server so the same rule is enforced in both places.
 */
export interface FalsifierCheck {
  readonly ok: boolean;
  readonly reason: string | null;
}

const CONDITION = /\b(if|when|unless|should)\b/i;
const MEASURABLE =
  /\b(fewer|more|less|at least|at most|below|above|under|over|exceeds?|reaches?|signs?|declines?|refuses?|prepay|prepays?)\b[^.;]*\b\d+\b|\b\d+\b[^.;]*\b(of|out of|days?|weeks?|months?|interviews?|organi[sz]ations?|managers?|buyers?|pilots?|prepayments?|clinics?)\b/i;

export function checkFalsifier(value: string): FalsifierCheck {
  const text = value.trim();
  // A short but genuinely measurable observation is stronger than forty
  // characters of prose. The 40-character floor applies only to vague text.
  if (text.length < 40 && !MEASURABLE.test(text)) {
    return { ok: false, reason: "A falsifier must be at least 40 characters." };
  }
  if (!CONDITION.test(text)) {
    return { ok: false, reason: "Name the condition: if, when, unless or should." };
  }
  if (!MEASURABLE.test(text)) {
    return { ok: false, reason: "FALSIFIER_NOT_OBSERVABLE: include a measurable outcome." };
  }
  return { ok: true, reason: null };
}

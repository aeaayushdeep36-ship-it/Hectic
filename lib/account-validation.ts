/**
 * Account signup field validation helpers (name, mobile number, password match).
 */

export interface FieldValidationResult {
  readonly ok: boolean;
  readonly reason: string | null;
}

export function validatePersonName(raw: string, label: string): FieldValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: `Please enter your ${label.toLowerCase()}.` };
  }
  if (trimmed.length > 80) {
    return { ok: false, reason: `${label} must be 80 characters or fewer.` };
  }
  return { ok: true, reason: null };
}

export function validateMobileNumber(raw: string): FieldValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: "Please enter your mobile number." };
  }
  if (!/^\+?[\d\s\-()]+$/.test(trimmed)) {
    return { ok: false, reason: "Mobile number may only contain digits, spaces, hyphens, parentheses, and a leading +." };
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return { ok: false, reason: "Please enter a valid mobile number (7 to 15 digits)." };
  }
  return { ok: true, reason: null };
}

export function validatePasswordMatch(password: string, confirmPassword: string): FieldValidationResult {
  if (password.length < 6) {
    return { ok: false, reason: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { ok: false, reason: "Passwords do not match. Please re-enter the same password." };
  }
  return { ok: true, reason: null };
}

function looksLikeGibberish(text: string): boolean {
  const cleaned = text.trim();
  if (/(.)\1{4,}/i.test(cleaned)) return true; // 5+ identical chars in a row
  const words = cleaned.split(/\s+/).filter((w) => /[a-zA-Z]{2,}/.test(w));
  if (words.length === 0) return true;
  // Flag long single-token keyboard mashes with very low vowel ratio
  for (const w of words) {
    const letters = w.replace(/[^a-zA-Z]/g, "");
    if (letters.length >= 7 && !/[aeiouyAEIOUY]/.test(letters)) return true;
  }
  return false;
}

export function validateCsvFileMeta(file: { name: string; size: number; type?: string }): FieldValidationResult {
  const lower = file.name.trim().toLowerCase();
  if (!lower.endsWith(".csv")) {
    return {
      ok: false,
      reason: `Unsupported file "${file.name}". Only .csv interview roster files are accepted.`,
    };
  }
  const allowedTypes = new Set(["", "text/csv", "application/vnd.ms-excel", "text/plain"]);
  if (file.type && !allowedTypes.has(file.type.toLowerCase())) {
    return {
      ok: false,
      reason: `Invalid MIME type "${file.type}". Please upload a valid .csv file.`,
    };
  }
  if (file.size <= 0) {
    return { ok: false, reason: "The selected CSV file is empty." };
  }
  if (file.size > 2_000_000) {
    return { ok: false, reason: "CSV file exceeds the 2 MB size limit." };
  }
  return { ok: true, reason: null };
}

export function validateClaimDraftText(rawText: string): FieldValidationResult {
  const trimmed = rawText.trim();
  if (trimmed.length < 12) {
    return {
      ok: false,
      reason:
        "Claim is too short (minimum 12 characters). Write a testable statement, e.g. 'Clinic buyers paid annual invoices after pilot'.",
    };
  }
  const words = trimmed.split(/\s+/).filter((w) => /[a-zA-Z]{2,}/.test(w));
  if (words.length < 3) {
    return {
      ok: false,
      reason:
        "Claim must contain at least 3 meaningful words describing who did what (e.g. 'Clinic buyers paid annual invoices').",
    };
  }
  if (looksLikeGibberish(trimmed)) {
    return {
      ok: false,
      reason:
        "Claim text appears to be random or placeholder characters. Enter a clear, testable founder or customer claim.",
    };
  }
  return { ok: true, reason: null };
}

export function validateClaimSubmission(input: {
  rawText: string;
  population: string;
  predicate: string;
  claimType: "theme" | "prevalence";
  observedK: string;
  observedN: string;
}): FieldValidationResult {
  const textCheck = validateClaimDraftText(input.rawText);
  if (!textCheck.ok) return textCheck;

  const pop = input.population.trim();
  if (pop.length < 2 || !/[a-zA-Z]{2,}/.test(pop) || looksLikeGibberish(pop)) {
    return {
      ok: false,
      reason:
        "Target Population is invalid. Specify the customer segment or role (e.g. 'Clinics' or 'Dental practices').",
    };
  }

  const pred = input.predicate.trim();
  if (pred.length < 3 || !/[a-zA-Z]{2,}/.test(pred) || looksLikeGibberish(pred)) {
    return {
      ok: false,
      reason:
        "Predicate is invalid. Describe the observable outcome or evidence (e.g. 'paid annual invoice').",
    };
  }

  if (input.claimType === "prevalence") {
    const k = Number.parseInt(input.observedK, 10);
    const n = Number.parseInt(input.observedN, 10);
    if (!Number.isFinite(n) || n <= 0) {
      return {
        ok: false,
        reason: "Prevalence claims require Observed n (total approached) >= 1.",
      };
    }
    if (!Number.isFinite(k) || k < 0 || k > n) {
      return {
        ok: false,
        reason: "Prevalence claims require Observed k between 0 and Observed n.",
      };
    }
  }

  return { ok: true, reason: null };
}

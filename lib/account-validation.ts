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

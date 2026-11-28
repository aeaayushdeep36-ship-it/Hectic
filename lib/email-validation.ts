/**
 * Strict email validation and disposable/temporary email domain blocker.
 */

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "10minmail.com",
  "burnermail.io",
  "discard.email",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "inboxbear.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailnesia.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "nada.email",
  "sharklasers.com",
  "spam4.me",
  "spamgourmet.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "tmpmail.net",
  "tmpmail.org",
  "trash-mail.com",
  "trashmail.com",
  "trashmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

export interface EmailValidationResult {
  readonly ok: boolean;
  readonly reason: string | null;
}

export function validateEmail(raw: string): EmailValidationResult {
  const email = raw.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, reason: "Please enter a valid email address." };
  }

  const [local = "", domain = ""] = email.split("@");
  if (!local || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return { ok: false, reason: "Please enter a valid email address." };
  }
  const tld = domain.split(".").at(-1) ?? "";
  if (tld.length < 2 || domain.includes("..")) {
    return { ok: false, reason: "Please enter a valid email domain." };
  }

  // Block exact match or subdomain of any known disposable/temp-mail provider.
  for (const blocked of DISPOSABLE_DOMAINS) {
    if (domain === blocked || domain.endsWith(`.${blocked}`)) {
      return {
        ok: false,
        reason: "Temporary or disposable email addresses are not permitted. Please use a permanent email.",
      };
    }
  }

  return { ok: true, reason: null };
}

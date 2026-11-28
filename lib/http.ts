/**
 * Request-boundary helpers shared by every route handler.
 *
 * Hectic has no accounts: it is a local tool. The threats that remain for a
 * local web app are other websites driving it from the user's browser (CSRF),
 * DNS rebinding, oversized bodies, cost abuse of the provider keys, and
 * internal error text leaking to the client. These helpers cover those.
 *
 * Non-browser clients (curl, tests calling a handler directly) send no Origin,
 * Sec-Fetch-Site or Host header and are allowed through; a browser always sends
 * them, so a cross-site page cannot get past checkRequest().
 */
import { NextResponse } from "next/server";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Extra hostnames (comma-separated) for a reverse proxy or LAN demo. */
function extraHosts(): Set<string> {
  return new Set(
    (process.env.HECTIC_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function hostnameOf(hostHeader: string): string {
  const host = hostHeader.trim().toLowerCase();
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end > 0 ? host.slice(1, end) : host;
  }
  return host.split(":")[0] ?? "";
}

function forbidden(code: string): NextResponse {
  return NextResponse.json({ error: code }, { status: 403 });
}

export interface RequestCheckOptions {
  /** Require a JSON content type (set on routes that read a body). */
  readonly json?: boolean;
}

/**
 * Returns a ready-made error response when the request must be refused, or
 * null when it may proceed. Call it first in every handler.
 */
export function checkRequest(
  request: Request,
  options: RequestCheckOptions = {},
): NextResponse | null {
  const host = request.headers.get("host");

  // DNS rebinding: a hostile domain resolving to 127.0.0.1 still sends its own
  // name in Host, so an allowlist of loopback names defeats it.
  if (host) {
    const name = hostnameOf(host);
    if (!LOOPBACK_HOSTS.has(name) && !extraHosts().has(name)) {
      return forbidden("FORBIDDEN_HOST");
    }
  }

  // CSRF: refuse anything a browser marks as cross-site, and any Origin that
  // is not this server.
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return forbidden("CROSS_SITE_REQUEST");
  }
  const origin = request.headers.get("origin");
  if (origin && host) {
    try {
      if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) {
        return forbidden("CROSS_ORIGIN_REQUEST");
      }
    } catch {
      return forbidden("CROSS_ORIGIN_REQUEST");
    }
  }

  // A cross-site <form> can only send text/plain, multipart or urlencoded, so
  // demanding JSON also blocks simple-request CSRF on body-carrying routes.
  if (options.json) {
    const type = request.headers.get("content-type") ?? "";
    if (!/^application\/json\b/i.test(type)) {
      return NextResponse.json({ error: "JSON_REQUIRED" }, { status: 415 });
    }
  }

  return null;
}

/**
 * Reads a JSON object body. Malformed JSON, arrays, null and primitives all
 * become `{}` so handlers never dereference null. Returns null when the body
 * exceeds maxBytes.
 */
export async function readJsonObject(
  request: Request,
  maxBytes = 100_000,
): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return null;

  const text = await request.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > maxBytes) return null;

  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function payloadTooLarge(): NextResponse {
  return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
}

/** Error text safe to show a client: no database or stack internals. */
export function publicError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (!message) return fallback;
  if (/sqlite|constraint|foreign key|unique|syntax error|no such (table|column)|\bat\s+\S+\s+\(/i.test(message)) {
    return fallback;
  }
  return message.slice(0, 200);
}

// ---------------------------------------------------------------------------
// Rate limiting (in-process sliding window). The app is single-process and
// local, so this is enough to stop a loop or a hostile page from draining a
// free-tier provider key.
// ---------------------------------------------------------------------------

const windows = new Map<string, number[]>();

/** True when the caller has exceeded `limit` calls in the last `windowMs`. */
export function isRateLimited(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  if (windows.size > 100) {
    for (const [k, timestamps] of windows.entries()) {
      const alive = timestamps.filter((time) => now - time < windowMs);
      if (alive.length === 0) windows.delete(k);
      else windows.set(k, alive);
    }
  }
  const recent = (windows.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    windows.set(key, recent);
    return true;
  }
  recent.push(now);
  windows.set(key, recent);
  return false;
}

export function tooManyRequests(): NextResponse {
  return NextResponse.json(
    { error: "RATE_LIMITED" },
    { status: 429, headers: { "retry-after": "60" } },
  );
}

/** Real (billable or quota-limited) providers only; the offline mock is free. */
export function isMetered(providerId: string | undefined): boolean {
  return providerId !== undefined && providerId !== "mock";
}

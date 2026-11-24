/**
 * A3 — constraint explainer. The deterministic template is authoritative.
 * A provider may only rephrase it; any new digit or level is rejected.
 */
import { explain } from "../engine/index";
import { guard } from "../lib/guard";
import type { Claim, Finding } from "../lib/types";
import {
  cacheKey,
  completeWithRetry,
  getCached,
  getProvider,
  parseModelJson,
  putCached,
  wrapUserContent,
  type Provider,
} from "../providers";
import type { AgentOptions } from "./formaliser";

const SYSTEM_PROMPT =
  "Rephrase the given verdict in two factual sentences. Never characterise " +
  "the founder. Never introduce a number, level or binding not present in " +
  'the input. Return JSON: {"text": string}.';

function numbersIn(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

export interface ExplainResult {
  readonly text: string;
  readonly usedProvider: boolean;
  readonly fallbackReason: string | null;
}

export async function explainFinding(
  claim: Claim,
  finding: Finding,
  provider: Provider = getProvider(),
  options: AgentOptions = {},
): Promise<ExplainResult> {
  const fallback = explain(claim, finding);
  const allowed = new Set(numbersIn(fallback));
  // The claim text is untrusted third-party content: redact before egress.
  const safeClaim = guard(claim.rawText).redacted;
  const user = wrapUserContent(JSON.stringify({ verdict: fallback, claim: safeClaim }));
  const key = cacheKey(["A3", provider.id, provider.modelId, fallback, safeClaim]);

  const accept = (text: string): boolean =>
    text.length >= 20 && numbersIn(text).every((value) => allowed.has(value));

  const readText = (value: unknown): string | null => {
    const candidate = Array.isArray(value) ? value[0] : value;
    if (!candidate || typeof candidate !== "object") return null;
    const record = candidate as Record<string, unknown>;
    const nested =
      record.result && typeof record.result === "object"
        ? (record.result as Record<string, unknown>)
        : {};
    const text =
      record.text ??
      record.explanation ??
      record.rephrased ??
      record.answer ??
      record.verdict ??
      nested.text ??
      nested.explanation;
    return typeof text === "string" ? text : null;
  };

  const cached = getCached(key);
  if (cached !== undefined) {
    try {
      const text = readText(parseModelJson(cached));
      if (text && accept(text)) {
        return { text, usedProvider: true, fallbackReason: null };
      }
    } catch {
      // Cached value was not usable; continue to the provider.
    }
  }

  // A single malformed body is common on free-tier gateways. Re-ask once, then
  // return the deterministic verdict; no model text is ever trusted blindly.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const completion = await completeWithRetry(provider, SYSTEM_PROMPT, user, options.retry);
      if (!completion.ok) {
        return { text: fallback, usedProvider: false, fallbackReason: `PROVIDER_${completion.errorCode ?? "ERROR"}` };
      }
      const text = readText(parseModelJson(completion.text));
      if (!text) {
        if (attempt === 1) {
          return { text: fallback, usedProvider: false, fallbackReason: "SCHEMA_INVALID" };
        }
        continue;
      }
      if (!accept(text)) {
        return { text: fallback, usedProvider: false, fallbackReason: "NUMERIC_GUARD" };
      }
      putCached(key, completion.text);
      return { text, usedProvider: true, fallbackReason: null };
    } catch {
      if (attempt === 1) {
        return { text: fallback, usedProvider: false, fallbackReason: "SCHEMA_INVALID" };
      }
    }
  }
  return { text: fallback, usedProvider: false, fallbackReason: "SCHEMA_INVALID" };
}

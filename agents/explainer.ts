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

  const cached = getCached(key);
  if (cached !== undefined) {
    try {
      const body = JSON.parse(cached) as { text?: unknown };
      if (typeof body.text === "string" && accept(body.text)) {
        return { text: body.text, usedProvider: true, fallbackReason: null };
      }
    } catch {
      // Cached value was not usable; continue to the provider.
    }
  }

  try {
    const completion = await completeWithRetry(provider, SYSTEM_PROMPT, user, options.retry);
    if (!completion.ok) {
      return { text: fallback, usedProvider: false, fallbackReason: `PROVIDER_${completion.errorCode ?? "ERROR"}` };
    }
    const body = JSON.parse(completion.text) as { text?: unknown };
    if (typeof body.text !== "string" || !accept(body.text)) {
      return { text: fallback, usedProvider: false, fallbackReason: "NUMERIC_GUARD" };
    }
    putCached(key, completion.text);
    return { text: body.text, usedProvider: true, fallbackReason: null };
  } catch {
    return { text: fallback, usedProvider: false, fallbackReason: "SCHEMA_INVALID" };
  }
}

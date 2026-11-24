/**
 * A3 — constraint explainer. The deterministic template is authoritative.
 * A provider may only rephrase it; any new digit or level is rejected.
 */
import { explain } from "../engine/index";
import type { Claim, Finding } from "../lib/types";
import { getProvider, wrapUserContent, type Provider } from "../providers";

function numbersIn(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

export async function explainFinding(
  claim: Claim,
  finding: Finding,
  provider: Provider = getProvider(),
): Promise<{ text: string; usedProvider: boolean }> {
  const fallback = explain(claim, finding);
  const allowed = new Set(numbersIn(fallback));

  try {
    const completion = await provider.complete(
      "Rephrase the given verdict in two factual sentences. Never characterise the founder. Never introduce a number, level or binding not present in the input. Return JSON: {\"text\": string}.",
      wrapUserContent(JSON.stringify({ verdict: fallback, claim: claim.rawText })),
    );
    if (!completion.ok) return { text: fallback, usedProvider: false };
    const body = JSON.parse(completion.text) as { text?: unknown };
    if (typeof body.text !== "string" || body.text.length < 20) {
      return { text: fallback, usedProvider: false };
    }
    const extra = numbersIn(body.text).filter((value) => !allowed.has(value));
    if (extra.length > 0) return { text: fallback, usedProvider: false };
    return { text: body.text, usedProvider: true };
  } catch {
    return { text: fallback, usedProvider: false };
  }
}

/**
 * A1 — claim formaliser. Language only. The proposal schema has no numeric
 * field, so a model cannot emit a level even if an injection asks it to.
 */
import { guard } from "../lib/guard";
import { templateProposal } from "../lib/heuristics";
import { claimProposalSchema } from "../lib/schemas";
import {
  cacheKey,
  completeWithRetry,
  getCached,
  getProvider,
  putCached,
  wrapUserContent,
  type Provider,
  type RetryOptions,
} from "../providers";
import { PROMPT_VERSION, readSystemPrompt } from "./prompts";

export type ClaimProposal = ReturnType<typeof templateProposal>;
export { templateProposal };

export interface AgentOptions {
  readonly retry?: RetryOptions;
}

export interface FormaliseResult {
  readonly proposal: ClaimProposal;
  readonly injection: boolean;
  readonly flags: readonly string[];
  readonly usedProvider: boolean;
  readonly fallbackReason: string | null;
}

export async function formalise(
  rawText: string,
  provider: Provider = getProvider(),
  options: AgentOptions = {},
): Promise<FormaliseResult> {
  const checked = guard(rawText);
  const safeText = checked.redacted;
  const system = readSystemPrompt("claim-formaliser", PROMPT_VERSION);
  const user = wrapUserContent(
    JSON.stringify({
      rawText: safeText,
      schema: {
        rawText: "string",
        population: "string",
        predicate: "string",
        kind: "enum",
        claimType: "theme | prevalence",
        rationale: "string",
        ambiguityFlags: "string[]",
      },
    }),
  );
  const key = cacheKey(["A1", PROMPT_VERSION, provider.id, provider.modelId, safeText]);

  const tryParse = (text: string): ClaimProposal | null => {
    try {
      const candidate = claimProposalSchema.safeParse(JSON.parse(text));
      return candidate.success ? { ...candidate.data, rawText: safeText } : null;
    } catch {
      return null;
    }
  };

  const cached = getCached(key);
  if (cached !== undefined) {
    const proposal = tryParse(cached);
    if (proposal) {
      return { proposal, injection: checked.injected, flags: checked.flags, usedProvider: true, fallbackReason: null };
    }
  }

  let fallbackReason: string | null = null;
  try {
    const completion = await completeWithRetry(provider, system, user, options.retry);
    if (!completion.ok) {
      fallbackReason = `PROVIDER_${completion.errorCode ?? "ERROR"}`;
    } else {
      const proposal = tryParse(completion.text);
      if (proposal) {
        putCached(key, completion.text);
        return { proposal, injection: checked.injected, flags: checked.flags, usedProvider: true, fallbackReason: null };
      }
      fallbackReason = "SCHEMA_INVALID";
    }
  } catch (error) {
    fallbackReason = error instanceof Error ? error.message.slice(0, 60) : "PROVIDER_THREW";
  }

  return {
    proposal: templateProposal(safeText),
    injection: checked.injected,
    flags: checked.flags,
    usedProvider: false,
    fallbackReason,
  };
}

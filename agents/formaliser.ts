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
  parseModelJson,
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

const KIND_ALIASES: Readonly<Record<string, string>> = {
  "willingness to pay": "willingness_to_pay",
  "willingness-to-pay": "willingness_to_pay",
  willingness_to_pay: "willingness_to_pay",
  role_ownership: "role_ownership",
  "role ownership": "role_ownership",
};

function normaliseKind(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return KIND_ALIASES[key] ?? key;
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
      const parsed = parseModelJson(text);
      // The raw sentence is server-owned input, not something a model must echo.
      // Some open models also emit snake_case aliases; normalise both here rather
      // than turning a usable proposal into a schema fallback.
      const record =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : null;
      const candidateValue = record
        ? {
            ...record,
            rawText: safeText,
            kind: normaliseKind(record.kind),
            claimType:
              typeof (record.claimType ?? record.claim_type) === "string"
                ? String(record.claimType ?? record.claim_type).trim().toLowerCase()
                : record.claimType ?? record.claim_type,
            ambiguityFlags: record.ambiguityFlags ?? record.ambiguity_flags,
            ...(typeof record.rationale === "string"
              ? { rationale: record.rationale.slice(0, 400) }
              : {}),
          }
        : parsed;
      const candidate = claimProposalSchema.safeParse(candidateValue);
      return candidate.success ? candidate.data : null;
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
  // Live providers occasionally emit one unusable body (empty object, prose or
  // a truncated object). Re-ask once inside the same bounded retry policy; the
  // Zod schema still decides what is acceptable, and the template remains the
  // fallback if the second body is unusable too.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const completion = await completeWithRetry(provider, system, user, options.retry);
      if (!completion.ok) {
        fallbackReason = `PROVIDER_${completion.errorCode ?? "ERROR"}`;
        break;
      }
      const proposal = tryParse(completion.text);
      if (proposal) {
        putCached(key, completion.text);
        return { proposal, injection: checked.injected, flags: checked.flags, usedProvider: true, fallbackReason: null };
      }
      fallbackReason = "SCHEMA_INVALID";
    } catch (error) {
      fallbackReason = error instanceof Error ? error.message.slice(0, 60) : "PROVIDER_THREW";
      break;
    }
  }

  return {
    proposal: templateProposal(safeText),
    injection: checked.injected,
    flags: checked.flags,
    usedProvider: false,
    fallbackReason,
  };
}

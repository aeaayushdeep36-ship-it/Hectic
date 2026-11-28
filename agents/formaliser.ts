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

const SCHEMA_VERSION = "claimProposalSchema.v1";

const KIND_ALIASES: Readonly<Record<string, string>> = {
  "willingness to pay": "willingness_to_pay",
  "willingness-to-pay": "willingness_to_pay",
  willingness_to_pay: "willingness_to_pay",
  role_ownership: "role_ownership",
  "role ownership": "role_ownership",
};

const PREVALENCE_SIGNAL =
  /(?:\b(?:most|majority|half|percent|every|share|proportion|rate)\b|\d+\s*%|\d+\s*(?:of|out of)\s*\d+)/i;

function normaliseKind(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return KIND_ALIASES[key] ?? key;
}

function cleanTruncate(text: string, maxLen = 400): string {
  if (text.length <= maxLen) return text;
  const sliced = text.slice(0, maxLen);
  const lastSentence = Math.max(sliced.lastIndexOf(". "), sliced.lastIndexOf("! "), sliced.lastIndexOf("? "));
  if (lastSentence >= maxLen * 0.5) return sliced.slice(0, lastSentence + 1).trim();
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace >= maxLen * 0.5 ? sliced.slice(0, lastSpace) : sliced).trim();
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
  const basePayload = {
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
  };
  const key = cacheKey(["A1", PROMPT_VERSION, SCHEMA_VERSION, provider.id, provider.modelId, safeText]);

  const tryParse = (
    text: string,
  ): { proposal: ClaimProposal | null; issues: string } => {
    try {
      const parsed = parseModelJson(text);
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
              ? { rationale: cleanTruncate(record.rationale, 400) }
              : {}),
          }
        : parsed;
      const candidate = claimProposalSchema.safeParse(candidateValue);
      if (candidate.success) {
        const expectedPrevalence = PREVALENCE_SIGNAL.test(safeText);
        const heuristicClaimType = expectedPrevalence ? "prevalence" : "theme";
        const flags = [...candidate.data.ambiguityFlags];
        if (
          candidate.data.claimType !== heuristicClaimType &&
          !flags.includes("claimType_disagreement")
        ) {
          flags.push("claimType_disagreement");
        }
        return {
          proposal: { ...candidate.data, ambiguityFlags: flags },
          issues: "",
        };
      }
      const issues = candidate.error.issues
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .slice(0, 4)
        .join("; ");
      return { proposal: null, issues };
    } catch {
      return { proposal: null, issues: "malformed JSON" };
    }
  };

  const cached = getCached(key);
  if (cached !== undefined) {
    const { proposal } = tryParse(cached);
    if (proposal) {
      return {
        proposal,
        injection: checked.injected,
        flags: checked.flags,
        usedProvider: true,
        fallbackReason: null,
      };
    }
  }

  let fallbackReason: string | null = null;
  let lastIssues = "";

  // Re-ask once with the specific Zod validation error so low-temperature models
  // can self-correct instead of repeating the identical invalid JSON.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const user = wrapUserContent(
        JSON.stringify(
          attempt === 0 || !lastIssues
            ? basePayload
            : { ...basePayload, repairHint: `Previous response failed schema validation: ${lastIssues}` },
        ),
      );
      const completion = await completeWithRetry(provider, system, user, options.retry);
      if (!completion.ok) {
        fallbackReason = `PROVIDER_${completion.errorCode ?? "ERROR"}`;
        break;
      }
      const { proposal, issues } = tryParse(completion.text);
      if (proposal) {
        putCached(key, completion.text);
        return {
          proposal,
          injection: checked.injected,
          flags: checked.flags,
          usedProvider: true,
          fallbackReason: null,
        };
      }
      lastIssues = issues;
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

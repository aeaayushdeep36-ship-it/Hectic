/**
 * A1 — claim formaliser. Language only. The proposal schema has no numeric
 * field, so a model cannot emit a level even if an injection asks it to.
 */
import { z } from "zod";
import { guard } from "../lib/guard";
import { claimProposalSchema } from "../lib/schemas";
import { getProvider, wrapUserContent, type Provider } from "../providers";
import { PROMPT_VERSION, readSystemPrompt } from "./prompts";

export type ClaimProposal = z.infer<typeof claimProposalSchema>;

const PREVALENCE = /\b(most|majority|percent|%\b|rate|share|half|out of ten|of \d+)\b/i;
const WTP = /\b(pay|price|per month|\/mo|€|£|\$|willing)\b/i;
const FREQUENCY = /\b(every|daily|weekly|often|frequency|each week)\b/i;

/** Deterministic fallback. Narrow by construction: it never widens a population. */
export function templateProposal(rawText: string): ClaimProposal {
  const flags: string[] = [];
  const roleMatch = rawText.match(
    /\b(managers?|founders?|engineers?|doctors?|dentists?|buyers?|users?|owners?|teachers?|nurses?|lawyers?)\b/i,
  );
  const population = roleMatch ? roleMatch[0] : "";
  if (!population) flags.push("POPULATION_UNSTATED");
  if (!/\b(in|at|from|across)\b/i.test(rawText)) flags.push("GEOGRAPHY_UNCLEAR");
  if (PREVALENCE.test(rawText) && WTP.test(rawText)) flags.push("SPLIT_REQUIRED");

  const kind = WTP.test(rawText)
    ? "willingness_to_pay"
    : FREQUENCY.test(rawText)
      ? "frequency"
      : "pain";

  return claimProposalSchema.parse({
    rawText,
    population: population || "the people named in the claim",
    predicate: rawText,
    kind,
    claimType: PREVALENCE.test(rawText) ? "prevalence" : "theme",
    rationale: "Deterministic template. No model was available; every field remains editable.",
    ambiguityFlags: [...new Set(flags)],
  });
}

export async function formalise(
  rawText: string,
  provider: Provider = getProvider(),
): Promise<{ proposal: ClaimProposal; injection: boolean; flags: string[] }> {
  const checked = guard(rawText);
  const system = readSystemPrompt("claim-formaliser", PROMPT_VERSION);
  const user = wrapUserContent(
    JSON.stringify({
      rawText: checked.redacted,
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

  let proposal: ClaimProposal | null = null;
  try {
    const completion = await provider.complete(system, user);
    if (completion.ok) {
      const candidate = claimProposalSchema.safeParse(JSON.parse(completion.text));
      if (candidate.success) {
        proposal = { ...candidate.data, rawText };
      }
    }
  } catch {
    // Provider failures degrade to the template; they never fail the run.
  }

  return {
    proposal: proposal ?? templateProposal(rawText),
    injection: checked.injected,
    flags: [...checked.flags],
  };
}

/**
 * A4 — statement composer. Receives a locked ledger and describes it.
 * All numbers in the output come from the ledger, never from a model.
 */
import type { FindingView, RunView } from "../lib/dto";

export interface StatementSections {
  readonly method: string;
  readonly coverage: string;
  readonly findings: string;
  readonly limitations: string;
}

export function composeStatement(run: RunView): StatementSections {
  const unresolved = run.findings.filter((finding) => finding.resolution === null).length;
  const byKind = run.findings.reduce<Record<string, number>>((acc, finding) => {
    acc[finding.finding] = (acc[finding.finding] ?? 0) + 1;
    return acc;
  }, {});

  return {
    method:
      "Evidence type was entered by the founder from the interview roster. The counting unit is the independent organisation. Levels follow Pattyn, Dillen & Goetz (2026); thematic rungs follow Guest, Bunce & Johnson (2006) and Hennink & Kaiser (2017); intervals are 95% Wilson score intervals.",
    coverage: describeFindings(run.findings),
    findings: `This run contains ${run.findings.length} claim${run.findings.length === 1 ? "" : "s"}: ${Object.entries(byKind)
      .map(([kind, count]) => `${count} ${kind.toLowerCase()}`)
      .join(", ")}. ${unresolved === 0 ? "Every non-supported claim carries a resolution and a falsifier." : `${unresolved} claim(s) remain unresolved.`}`,
    limitations:
      "A level means the strongest evidence type present, supported by this many independent organisations — not that the conclusion is true. Pattyn et al. is an exploratory study of 16 startups, not a law; saturation figures transfer from other research settings; and the Wilson interval assumes random sampling that a network-recruited sample never has.",
  };
}

function describeFindings(findings: readonly FindingView[]): string {
  if (findings.length === 0) return "No claims were analysed in this run.";
  return findings
    .map(
      (finding) =>
        `${finding.claimText}: L${finding.level} with ${finding.support} organisation${finding.support === 1 ? "" : "s"}.`,
    )
    .join(" ");
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getRun } from "../../../../server/store";
import { nextLevelTarget } from "../../../../server/threshold-view";
import type { FindingView } from "../../../../lib/dto";

export const dynamic = "force-dynamic";

export default async function RecruitingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) notFound();

  const actionable = run.findings.filter(
    (finding) => finding.binding !== null && finding.binding !== "support",
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <nav className="label mb-8">
        <Link href={`/runs/${id}`}>← Back to run</Link>
      </nav>

      <header>
        <h1 className="text-[28px] font-semibold">Recruiting brief</h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-muted)]">
          The smallest next conversation that would move a binding constraint. The cell and
          target type come from the verified finding; the minimum add is one independent
          organisation in that cell.
        </p>
      </header>

      {actionable.length === 0 ? (
        <p className="card mt-8 p-5 text-[var(--ink-muted)]">
          No recruiting action changes a verdict in this run. Support gaps require repeating an
          existing evidence type on more independent organisations.
        </p>
      ) : (
        <ol className="mt-8 space-y-4">
          {actionable.map((finding) => (
            <li key={finding.claimId} className="card p-5">
              <p className="mono text-[12px] text-[var(--ink-faint)]">{finding.claimId}</p>
              <h2 className="mt-1 text-[18px] font-semibold">{finding.claimText}</h2>
              <p className="mt-2 text-[14px]">{finding.explanation}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="label">Cell</dt>
                  <dd className="mono text-[13px]">{cellFor(finding)}</dd>
                </div>
                <div>
                  <dt className="label">Minimum add</dt>
                  <dd className="mono text-[13px]">1 independent org</dd>
                </div>
                <div>
                  <dt className="label">Target type</dt>
                  <dd className="mono text-[13px]">
                    L{finding.binding === "population" ? 2 : nextLevelTarget(finding.level)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[13px] text-[var(--ink-muted)]">
                Screening line: ask whether they have personally taken part in a paid pilot or
                signed a letter of intent in the last 90 days. Record the answer before the
                interview; do not infer it afterwards.
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function cellFor(finding: FindingView): string {
  switch (finding.binding) {
    case "population":
      return "in-population segment × economic role";
    case "type":
      return `highest-population segment × decision role`;
    case "support":
      return `current type · independent organisations`;
    case null:
      return "—";
  }
}

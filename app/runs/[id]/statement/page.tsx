import Link from "next/link";
import { notFound } from "next/navigation";
import { composeStatement } from "../../../../agents";
import { exportGate, getRun } from "../../../../server/store";

export const dynamic = "force-dynamic";

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) notFound();
  const gate = exportGate(id);
  const sections = composeStatement(run);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="no-print label mb-6 flex justify-between">
        <Link href={`/runs/${id}`}>← Back to run</Link>
        <span>Print / Save as PDF</span>
      </div>

      {!gate.ok ? <DraftWatermark /> : null}

      <article className="card p-8">
        <header className="border-b border-[var(--border)] pb-5">
          <p className="label">Discovery Evidence Statement</p>
          <h1 className="mt-2 text-[28px] font-semibold">Evidence statement</h1>
          <p className="mono mt-2 text-[12px] text-[var(--ink-muted)]">
            run {run.id} · finding hash {run.findingHash} · input hash {run.inputHash}
          </p>
        </header>

        {gate.ok ? (
          <>
            <section className="mt-6">
              <h2 className="label mb-2">Method</h2>
              <p>{sections.method}</p>
            </section>

            <section className="mt-6">
              <h2 className="label mb-2">Findings</h2>
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th scope="col" className="sunk p-2 text-left">Claim</th>
                    <th scope="col" className="sunk p-2 text-left">Claimed</th>
                    <th scope="col" className="sunk p-2 text-left">Verified</th>
                    <th scope="col" className="sunk p-2 text-left">Finding</th>
                  </tr>
                </thead>
                <tbody>
                  {run.findings.map((finding) => (
                    <tr key={finding.claimId} className="border-b border-[var(--border)]">
                      <td className="p-2">{finding.claimText}</td>
                      <td className="mono p-2">L{finding.claimed}</td>
                      <td className="mono p-2">L{finding.level} · {finding.support} orgs</td>
                      <td className="p-2">{finding.finding}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[13px] text-[var(--ink-muted)]">{sections.findings}</p>
            </section>

            <section className="mt-6">
              <h2 className="label mb-2">Resolutions and falsifiers</h2>
              {run.findings
                .filter((finding) => finding.resolution)
                .map((finding) => (
                  <div key={finding.claimId} className="mb-3">
                    <p className="mono text-[12px]">{finding.claimId} · {finding.resolution!.action}</p>
                    <p className="text-[13px]">{finding.resolution!.falsifier}</p>
                  </div>
                ))}
            </section>
          </>
        ) : (
          <p className="mt-6 text-[var(--signal)]">
            Claims section omitted. {gate.unresolved.length} finding(s) unresolved.
          </p>
        )}

        <footer className="mt-8 border-t border-[var(--border)] pt-4 text-[12px] text-[var(--ink-muted)]">
          <p>{sections.limitations}</p>
          <p className="mt-3">
            Hectic is an independent student project submitted to the AI Agents for Founders
            Challenge. It is not affiliated with, endorsed by, or produced by HETIC.
          </p>
        </footer>
      </article>
    </div>
  );
}

function DraftWatermark() {
  return (
    <div className="no-print mb-4 border border-[var(--signal-border)] bg-[var(--signal-bg)] p-3">
      <p className="mono text-[13px] text-[var(--signal)]">DRAFT — NOT VERIFIED</p>
    </div>
  );
}

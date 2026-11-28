import Link from "next/link";
import { notFound } from "next/navigation";
import { composeStatement } from "../../../../agents";
import { PrintButton } from "../../../../components/PrintButton";
import { exportGate, getRun, getWorkspace, listRuns, listWorkspaces } from "../../../../server/store";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  const params: Array<{ id: string }> = [];
  for (const ws of listWorkspaces()) {
    for (const r of listRuns(ws.slug)) {
      params.push({ id: r.id });
    }
  }
  return params;
}

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) notFound();
  const gate = exportGate(id);
  const workspace = getWorkspace(run.workspaceSlug);
  const sections = composeStatement(run);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      <div className="no-print border-b border-[var(--border-hair)] px-6 py-3.5 flex items-center justify-between">
        <Link
          href={`/runs/${id}`}
          className="font-mono-tabular text-[12px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] no-underline"
        >
          ← Back to Run {id}
        </Link>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-[760px] px-6 py-10">
        {!gate.ok && (
          <div
            role="status"
            className="mb-6 px-4 py-3 bg-[var(--status-crimson-bg)] border border-[var(--status-crimson-border)] text-[var(--status-crimson)] font-mono-tabular text-[12px]"
          >
            DRAFT — NOT VERIFIED ·{" "}
            {gate.empty
              ? "No confirmed claims audited."
              : `${gate.unresolved.length} blocking checkpoint(s) remaining.`}
          </div>
        )}

        <article className="print-sheet bg-[#F8F7F4] text-[#0F172A] px-10 py-12 rounded-none">
          <header className="pb-6 border-b border-[#0F172A]">
            <h1 className="font-display text-[38px] leading-[1.06] text-[#0F172A]">
              {gate.ok ? "Evidence Statement" : "Evidence Statement (Draft)"}
            </h1>
            <p className="mt-2 text-[13px] text-[#475569]">
              {workspace?.name ?? run.workspaceSlug} · {workspace?.orgCount ?? 0} independent organisations
            </p>
          </header>

          {gate.ok ? (
            <div className="mt-8 space-y-8">
              <section>
                <h2 className="font-mono-tabular text-[11px] uppercase tracking-[0.08em] text-[#475569] mb-2">
                  Method
                </h2>
                <p className="text-[13px] leading-[22px] text-[#0F172A]">{sections.method}</p>
              </section>

              <section>
                <h2 className="font-mono-tabular text-[11px] uppercase tracking-[0.08em] text-[#475569] mb-3">
                  Verified Findings
                </h2>
                <div className="border-t border-[#0F172A] divide-y divide-[#CBD5E1]">
                  {run.findings.map((finding, idx) => (
                    <div key={finding.claimId} className="py-3 grid grid-cols-12 items-baseline gap-2 text-[13px]">
                      <div className="col-span-6 text-[#0F172A]">
                        <span className="font-mono-tabular mr-2">
                          {String(idx + 1).padStart(2, "0")} ·
                        </span>
                        {finding.claimText}
                      </div>
                      <div className="col-span-2 font-mono-tabular">· L{finding.level}</div>
                      <div className="col-span-2 font-mono-tabular">
                        {finding.interval
                          ? `· [${finding.interval[0].toFixed(2)}, ${finding.interval[1].toFixed(2)}]`
                          : `· ${finding.support} orgs`}
                      </div>
                      <div
                        className={`col-span-2 text-right font-medium ${
                          finding.finding === "SUPPORTED" ? "text-[#0B534D]" : "text-[#991B1B]"
                        }`}
                      >
                        · {finding.finding}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {run.findings.some((f) => f.resolution) && (
                <section>
                  <h2 className="font-mono-tabular text-[11px] uppercase tracking-[0.08em] text-[#475569] mb-3">
                    Resolutions &amp; Falsifiers
                  </h2>
                  <div className="space-y-3">
                    {run.findings
                      .filter((f) => f.resolution)
                      .map((finding) => (
                        <div key={finding.claimId} className="border-l-2 border-[var(--accent-graphic)] pl-4 py-1">
                          <p className="font-mono-tabular text-[11px] uppercase text-[#475569]">
                            {finding.claimId} · {finding.resolution!.action}
                          </p>
                          <p className="mt-1 text-[13px] text-[#0F172A]">
                            {finding.resolution!.falsifier}
                          </p>
                        </div>
                      ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <p className="py-10 text-[13px] text-[#991B1B]">
              Resolve all blocking checkpoints on the run page before exporting.
            </p>
          )}

          <footer className="mt-12 pt-4 border-t border-[var(--accent-graphic)] text-[11px] text-[#475569]">
            <p className="font-mono-tabular">
              SHA-256 {(run.findingHash || run.inputHash).replace(/^sha256:/, "")} · ENGINE 1.0.0
            </p>
            <p className="mt-2">{sections.limitations}</p>
          </footer>
        </article>
      </div>
    </div>
  );
}

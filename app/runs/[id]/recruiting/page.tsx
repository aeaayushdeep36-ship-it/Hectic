import Link from "next/link";
import { notFound } from "next/navigation";
import { getRun, listRuns, listWorkspaces } from "../../../../server/store";
import { nextLevelTarget } from "../../../../server/threshold-view";
import type { FindingView } from "../../../../lib/dto";

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

export default async function RecruitingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) notFound();

  const actionable = run.findings.filter(
    (f) => f.binding !== null && f.binding !== "support",
  );

  return (
    <div className="min-h-screen bg-[#07080A] text-[#F5F6F8]">
      <header className="border-b border-[#1E222A] px-6 py-4 flex items-center justify-between">
        <Link
          href={`/runs/${id}`}
          className="font-mono-tabular text-[12px] text-[#9CA3AF] hover:text-[#F5F6F8] no-underline"
        >
          ← Back to Run {id}
        </Link>
        <span className="font-mono-tabular text-[11px] text-[#7D8CA3]">
          ENGINE v1.0.0
        </span>
      </header>

      <main className="mx-auto max-w-[960px] px-6 py-12">
        <h1 className="font-display text-[36px] leading-[1.08] text-[#F5F6F8]">
          Recruiting Brief
        </h1>
        <p className="mt-2 max-w-[56ch] text-[13px] text-[#9CA3AF]">
          The smallest next conversation that moves a binding constraint.
        </p>

        {actionable.length === 0 ? (
          <div className="mt-8 p-6 bg-[#0E1014] border border-[#1E222A] text-[13px] text-[#9CA3AF]">
            No recruiting actions move a binding constraint in this run.
          </div>
        ) : (
          <div className="mt-8 border-t border-[#1E222A] divide-y divide-[#1E222A]">
            {actionable.map((finding, idx) => (
              <article key={finding.claimId} className="py-6 space-y-3">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-[15px] font-medium text-[#F5F6F8]">
                    <span className="font-mono-tabular text-[#7D8CA3] mr-2">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {finding.claimText}
                  </h2>
                  <span className="font-mono-tabular text-[11px] text-[#D4AF6A] shrink-0">
                    TARGET L{finding.binding === "population" ? 2 : nextLevelTarget(finding.level)}
                  </span>
                </div>
                <p className="text-[13px] text-[#9CA3AF]">{finding.explanation}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 font-mono-tabular text-[12px]">
                  <div>
                    <span className="block text-[10px] uppercase text-[#7D8CA3]">Target Cell</span>
                    <span className="text-[#F5F6F8]">{cellFor(finding)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-[#7D8CA3]">Minimum Add</span>
                    <span className="text-[#F5F6F8]">1 independent org</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-[#7D8CA3]">Claim ID</span>
                    <span className="text-[#9CA3AF]">{finding.claimId}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function cellFor(finding: FindingView): string {
  switch (finding.binding) {
    case "population":
      return "in-population segment × economic role";
    case "type":
      return "highest-population segment × decision role";
    case "support":
      return "current type · independent organisations";
    case null:
      return "—";
  }
}

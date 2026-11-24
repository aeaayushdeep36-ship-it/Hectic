import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimFormaliser } from "../../../components/ClaimFormaliser";
import { CoverageMatrix } from "../../../components/CoverageMatrix";
import { RosterImport } from "../../../components/RosterImport";
import { WorkspaceActions } from "../../../components/WorkspaceActions";
import {
  getWorkspace,
  listClaims,
  listRuns,
  workspaceMatrix,
} from "../../../server/store";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = getWorkspace(slug);
  if (!workspace) notFound();

  const claims = listClaims(slug);
  const matrix = workspaceMatrix(slug);
  const runs = listRuns(slug);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="label mb-8">
        <Link href="/">Workspaces</Link> <span aria-hidden="true">/</span> {workspace.name}
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold">{workspace.name}</h1>
          <p className="mt-2 text-[var(--ink-muted)]">{workspace.contextNote}</p>
          <p className="mono mt-2 text-[12px] text-[var(--ink-faint)]">
            {workspace.evidenceCount} interviews · {workspace.orgCount} organisations ·{" "}
            {claims.length} claims
          </p>
        </div>
        <WorkspaceActions slug={slug} />
      </header>

      <section className="mt-8">
        <RosterImport slug={slug} />
      </section>

      <section className="card mt-8 p-5" aria-labelledby="matrix-heading">
        <h2 id="matrix-heading" className="text-[20px] font-semibold">
          Coverage
        </h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
          Each cell counts interviews and the distinct organisations behind them. The empty
          cell is the finding.
        </p>
        <div className="mt-5">
          <CoverageMatrix matrix={matrix} />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="claims-heading">
        <h2 id="claims-heading" className="label mb-4">
          Claims · {claims.length}
        </h2>
        {claims.length === 0 ? (
          <p className="text-[var(--ink-muted)]">No claims yet. Add one below.</p>
        ) : (
          <ol className="space-y-3">
            {claims.map((claim) => (
              <li key={claim.id} className="card p-4">
                <p className="mono text-[12px] text-[var(--ink-faint)]">
                  {claim.id} · {claim.claimType} · L{claim.claimedLevel}
                  {claim.confirmed ? " · confirmed" : " · unconfirmed"}
                </p>
                <p className="mt-1">{claim.rawText}</p>
                <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
                  Population: {claim.population}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-8">
        <ClaimFormaliser slug={slug} />
      </section>

      <section className="mt-8" aria-labelledby="runs-heading">
        <h2 id="runs-heading" className="label mb-4">
          Runs · {runs.length}
        </h2>
        {runs.length === 0 ? (
          <p className="text-[var(--ink-muted)]">No runs yet.</p>
        ) : (
          <ul className="space-y-2">
            {runs.map((run) => (
              <li key={run.id}>
                <Link className="card flex justify-between p-3 no-underline" href={`/runs/${run.id}`}>
                  <span className="mono text-[13px]">{run.id}</span>
                  <span className="mono text-[13px]">{run.status}</span>
                  <span className="mono text-[12px] text-[var(--ink-faint)]">{run.findingHash}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

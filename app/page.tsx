import Link from "next/link";
import { listWorkspaces } from "../server/store";

export const dynamic = "force-dynamic";

export default function Home() {
  const workspaces = listWorkspaces();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="border-b border-[var(--border)] pb-8">
        <p className="label">Hectic / evidence coverage auditor</p>
        <h1 className="mt-4 text-[40px] font-semibold leading-[44px] tracking-[-0.02em]">
          Know what you actually know.
        </h1>
        <p className="mt-4 max-w-2xl text-[var(--ink-muted)]">
          Roster in, structured verdict out. Hectic audits who was in the room, not how
          good the quotes sound. Every number is computed; no model produces a level,
          a count or a verdict.
        </p>
      </header>

      <section className="mt-10" aria-labelledby="workspaces-heading">
        <h2 id="workspaces-heading" className="label mb-4">
          Workspaces · {workspaces.length}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <Link
                href={`/workspaces/${workspace.slug}`}
                className="card block p-5 no-underline hover:border-[var(--ink)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{workspace.name}</span>
                  {workspace.isDemo ? <span className="label">synthetic demo</span> : null}
                </div>
                <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
                  {workspace.contextNote}
                </p>
                <p className="mono mt-4 text-[12px] text-[var(--ink-faint)]">
                  {workspace.evidenceCount} interviews · {workspace.orgCount} orgs ·{" "}
                  {workspace.claimCount} claims · {workspace.runCount} runs
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-12 border-t border-[var(--border)] pt-6 text-[12px] text-[var(--ink-faint)]">
        <p>
          Hectic is an independent student project submitted to the AI Agents for Founders
          Challenge. It is not affiliated with, endorsed by, or produced by HETIC.
        </p>
      </footer>
    </main>
  );
}

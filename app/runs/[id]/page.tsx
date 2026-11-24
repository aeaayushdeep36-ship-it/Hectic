import Link from "next/link";
import { notFound } from "next/navigation";
import { RunConsole } from "../../../components/RunConsole";
import { getRun } from "../../../server/store";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="label mb-8">
        <Link href={`/workspaces/${run.workspaceSlug}`}>Workspace</Link>{" "}
        <span aria-hidden="true">/</span> Run
      </nav>

      <header>
        <h1 className="text-[28px] font-semibold">Findings</h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-muted)]">
          Claimed level and verified level are shown together. Every non-supported claim
          must carry a resolution and a falsifier before export.
        </p>
      </header>

      <div className="mt-8">
        <RunConsole initialRun={run} workspaceSlug={run.workspaceSlug} />
      </div>
    </main>
  );
}

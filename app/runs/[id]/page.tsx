import { notFound } from "next/navigation";
import { RunConsole } from "../../../components/RunConsole";
import { getRun, getWorkspace, listRuns, listWorkspaces } from "../../../server/store";

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

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) notFound();
  const workspace = getWorkspace(run.workspaceSlug);

  return (
    <RunConsole
      initialRun={run}
      workspaceSlug={run.workspaceSlug}
      workspaceName={workspace?.name}
      orgCount={workspace?.orgCount}
    />
  );
}

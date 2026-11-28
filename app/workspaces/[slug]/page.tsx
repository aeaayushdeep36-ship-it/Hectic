import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WorkspaceDashboardClient } from "../../../components/WorkspaceDashboardClient";
import type { EvidenceLevel } from "../../../lib/types";
import {
  getWorkspace,
  listClaims,
  listRuns,
  listWorkspaces,
  workspaceInputs,
  workspaceMatrix,
} from "../../../server/store";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return listWorkspaces().map((w) => ({ slug: w.slug }));
}

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = getWorkspace(slug);
  if (!workspace) notFound();

  const allWorkspaces = listWorkspaces().map((w) => ({
    name: w.name,
    slug: w.slug,
    runCount: w.runCount,
    runIds: [],
    isDemo: w.isDemo,
  }));
  const claims = listClaims(slug);
  const matrix = workspaceMatrix(slug);
  const runs = listRuns(slug);
  const latestRun = runs[0] ?? null;

  const { rows } = workspaceInputs(slug);
  const ladderCounts: Record<EvidenceLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const channelCounts: Record<string, number> = {};
  const networkOrgs = new Set<string>();
  const allOrgs = new Set<string>();

  for (const row of rows) {
    ladderCounts[row.evidenceType] = (ladderCounts[row.evidenceType] ?? 0) + 1;
    channelCounts[row.channel] = (channelCounts[row.channel] ?? 0) + 1;
    allOrgs.add(row.orgId);
    if (row.relationship === "founder_network") {
      networkOrgs.add(row.orgId);
    }
  }

  const totalOrgs = allOrgs.size;
  const topChannel = Math.max(0, ...Object.values(channelCounts));
  const integrity = {
    independentOrgs: totalOrgs,
    totalInterviews: rows.length,
    networkPct: totalOrgs > 0 ? Math.round((networkOrgs.size / totalOrgs) * 100) : 0,
    topChannelPct: rows.length > 0 ? Math.round((topChannel / rows.length) * 100) : 0,
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07080A]" />}>
      <WorkspaceDashboardClient
        workspace={workspace}
        workspaces={allWorkspaces}
        matrix={matrix}
        claims={claims}
        latestRun={latestRun}
        ladderCounts={ladderCounts}
        integrity={integrity}
      />
    </Suspense>
  );
}

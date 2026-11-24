import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { HydrationMarker } from "../components/HydrationMarker";
import { QueryProvider } from "../components/QueryProvider";
import { Sidebar } from "../components/Sidebar";
import { WorkspaceNavProvider } from "../components/WorkspaceNavContext";
import type { SidebarWorkspace } from "../lib/workspace-nav";
import { listRuns, listWorkspaces } from "../server/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hectic | Evidence Coverage Auditor",
  description: "Know what you actually know. Audit your founder evidence.",
};

/** Real rows from the store, mapped for the sidebar and the dashboard. */
function workspaceNav(): readonly SidebarWorkspace[] {
  return listWorkspaces().map((workspace) => ({
    name: workspace.name,
    slug: workspace.slug,
    runCount: workspace.runCount,
    runIds: listRuns(workspace.slug).map((run) => run.id),
    isDemo: workspace.isDemo,
  }));
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const workspaces = workspaceNav();

  return (
    <html lang="en">
      <body className="bg-[var(--paper)] min-h-screen flex">
        <QueryProvider>
          <HydrationMarker />
          <WorkspaceNavProvider workspaces={workspaces}>
            <Sidebar workspaces={workspaces} />
            <main className="flex-1 min-w-0 overflow-y-auto">
              <div className="mx-auto max-w-5xl px-6 py-12 lg:px-12">{children}</div>
            </main>
          </WorkspaceNavProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

"use client";

import { FileText, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SidebarWorkspace } from "@/lib/workspace-nav";

const focusRing =
  "focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-2";

/** Permanent sidebar backed by real workspace rows from the server layout. */
export function Sidebar({ workspaces }: { workspaces: readonly SidebarWorkspace[] }) {
  const segments = useSelectedLayoutSegments();
  const activeSlug =
    segments[0] === "workspaces"
      ? segments[1]
      : segments[0] === "runs"
        ? workspaces.find((workspace) => workspace.runIds.includes(segments[1] ?? ""))?.slug
        : undefined;
  const onHome = segments.length === 0;

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-white flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-2 border-b border-[var(--border)]">
        <div className="w-8 h-8 bg-[var(--ink)] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">H</span>
        </div>
        <span className="font-semibold text-[var(--ink)] tracking-tight text-lg">Hectic</span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <Link
          href="/"
          aria-current={onHome ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 bg-[var(--ink)] text-[var(--paper)] px-4 py-2.5 rounded-lg transition-colors text-sm font-medium",
            focusRing,
          )}
        >
          <Plus size={16} aria-hidden="true" />
          New Audit
        </Link>

        <div className="mt-8">
          <p className="label mb-3 px-2">Your Workspaces</p>
          <div className="space-y-1">
            {workspaces.map((workspace) => {
              const active = activeSlug === workspace.slug;
              const runLabel =
                workspace.runCount === 0
                  ? "No runs"
                  : `${workspace.runCount} ${workspace.runCount === 1 ? "run" : "runs"}`;
              return (
                <Link
                  key={workspace.slug}
                  href={`/workspaces/${workspace.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-[var(--surface-sunk)] text-[var(--ink)] font-medium"
                      : "text-[var(--ink-muted)] hover:bg-[var(--paper)]",
                    focusRing,
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText size={16} className="shrink-0 text-[var(--ink-faint)]" aria-hidden="true" />
                    <span className="truncate">{workspace.name}</span>
                    {workspace.isDemo ? (
                      <span
                        className="shrink-0 rounded border border-[var(--border)] px-1 text-[9px] uppercase tracking-wide text-[var(--ink-faint)]"
                        title="Synthetic demo workspace"
                      >
                        Demo
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[11px] text-[var(--ink-faint)] shrink-0">{runLabel}</span>
                </Link>
              );
            })}
            {workspaces.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[var(--ink-muted)]">No workspaces yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--border)]">
        <span
          aria-disabled="true"
          className="flex items-center gap-2 text-sm text-[var(--ink-muted)] opacity-60 px-3 py-2 cursor-not-allowed"
        >
          <Settings size={16} aria-hidden="true" />
          Settings
        </span>
      </div>
    </aside>
  );
}

"use client";

import { createContext } from "react";
import type { SidebarWorkspace } from "@/lib/workspace-nav";

/** Server-rendered workspace rows made available to client dashboard code. */
export const WorkspaceNavContext = createContext<readonly SidebarWorkspace[]>([]);

/** Client boundary wrapper: the server layout passes only serializable rows. */
export function WorkspaceNavProvider({
  workspaces,
  children,
}: {
  workspaces: readonly SidebarWorkspace[];
  children: React.ReactNode;
}) {
  return <WorkspaceNavContext.Provider value={workspaces}>{children}</WorkspaceNavContext.Provider>;
}

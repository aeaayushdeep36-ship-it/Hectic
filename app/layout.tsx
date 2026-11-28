import type { Metadata } from "next";
import { Cormorant_Garamond, Geist_Mono } from "next/font/google";
import { AuthProvider } from "../components/AuthProvider";
import { HydrationMarker } from "../components/HydrationMarker";
import { QueryProvider } from "../components/QueryProvider";
import { WorkspaceNavProvider } from "../components/WorkspaceNavContext";
import type { SidebarWorkspace } from "../lib/workspace-nav";
import { listRuns, listWorkspaces } from "../server/store";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-cormorant",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hectic | Deterministic Evidence Auditor",
  description: "Know what you actually know. Audit your founder evidence.",
};

function workspaceNav(): readonly SidebarWorkspace[] {
  return listWorkspaces().map((workspace) => ({
    name: workspace.name,
    slug: workspace.slug,
    runCount: workspace.runCount,
    runIds: listRuns(workspace.slug).map((run) => run.id),
    isDemo: workspace.isDemo,
  }));
}

const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('hectic-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const workspaces = workspaceNav();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorant.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] antialiased">
        <QueryProvider>
          <AuthProvider>
            <HydrationMarker />
            <WorkspaceNavProvider workspaces={workspaces}>
              {children}
            </WorkspaceNavProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

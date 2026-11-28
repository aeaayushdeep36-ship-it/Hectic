"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SidebarWorkspace } from "@/lib/workspace-nav";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]";

interface TopNavProps {
  workspaces: readonly SidebarWorkspace[];
}

export function TopNav({ workspaces }: TopNavProps) {
  const segments = useSelectedLayoutSegments();
  const onHome = segments.length === 0;
  const onWorkspaces = segments[0] === "workspaces";
  const onRuns = segments[0] === "runs";

  const activeWorkspaceSlug =
    segments[0] === "workspaces"
      ? segments[1]
      : segments[0] === "runs"
        ? workspaces.find((w) => w.runIds.includes(segments[1] ?? ""))?.slug
        : undefined;

  const [menuOpen, setMenuOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setWsOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setWsOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--cream)]/95"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div
        className="mx-auto flex items-center justify-between gap-6 px-6 py-0"
        style={{ maxWidth: "1200px", height: "68px" }}
      >
        {/* ── Wordmark ──────────────────────── */}
        <Link
          href="/"
          className={cn("flex items-center gap-3 no-underline shrink-0", focusRing)}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 36,
              height: 36,
              border: "1px solid var(--gold)",
              borderRadius: "2px",
              background: "linear-gradient(145deg, #162B21, #0A1611)",
            }}
          >
            <span
              className="serif text-[var(--gold-light)] font-semibold"
              style={{ fontSize: "18px", lineHeight: 1 }}
            >
              H
            </span>
          </div>
          <div className="leading-none">
            <div
              className="serif font-semibold text-[var(--ink)]"
              style={{ fontSize: "19px", letterSpacing: "0.01em" }}
            >
              Hectic
            </div>
            <div className="label" style={{ marginTop: "1px", letterSpacing: "0.1em" }}>
              Evidence Auditor
            </div>
          </div>
        </Link>

        {/* ── Desktop nav ───────────────────── */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          <NavLink href="/" active={onHome}>
            New Audit
          </NavLink>

          {/* Workspaces dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setWsOpen((p) => !p)}
              aria-expanded={wsOpen}
              aria-haspopup="listbox"
              className={cn(
                "px-4 py-2 text-sm transition-colors rounded-none border-b-2 flex items-center gap-1.5",
                onWorkspaces || onRuns
                  ? "border-[var(--forest)] text-[var(--ink)] font-medium"
                  : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]",
                focusRing,
              )}
            >
              <span>Workspaces</span>
              <span aria-hidden="true" style={{ fontSize: "10px", opacity: 0.7 }}>
                {wsOpen ? "▲" : "▼"}
              </span>
            </button>

            {wsOpen && (
              <div
                className="absolute left-0 top-full mt-1 w-64 bg-[var(--surface)] border border-[var(--border-strong)] shadow-xl z-50 drawer"
                style={{ borderRadius: "2px" }}
              >
                {workspaces.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[var(--ink-muted)]">
                    No workspaces yet.
                  </p>
                ) : (
                  <ul role="listbox" className="divide-y divide-[var(--border)]">
                    {workspaces.map((ws) => {
                      const isActive = activeWorkspaceSlug === ws.slug;
                      return (
                        <li key={ws.slug}>
                          <Link
                            href={`/workspaces/${ws.slug}`}
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => setWsOpen(false)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 text-sm no-underline transition-colors",
                              isActive
                                ? "bg-[var(--cream-dark)] text-[var(--ink)] font-medium"
                                : "text-[var(--ink)] hover:bg-[var(--cream)]",
                            )}
                          >
                            <span className="truncate">{ws.name}</span>
                            <span className="text-[11px] text-[var(--ink-faint)] ml-2 shrink-0 mono">
                              {ws.runCount} run{ws.runCount !== 1 ? "s" : ""}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          <NavLink href="/#how-it-works" active={false}>
            How It Works
          </NavLink>
        </nav>

        {/* ── CTA ───────────────────────────── */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link
            href="/#begin-audit"
            className={cn("btn btn-outlined text-sm no-underline", focusRing)}
            style={{ borderRadius: "2px" }}
          >
            Start Audit
            <span aria-hidden="true" style={{ fontSize: "13px" }}>↗</span>
          </Link>
        </div>

        {/* ── Mobile hamburger ──────────────── */}
        <button
          type="button"
          className="md:hidden p-2 text-[var(--ink)]"
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((p) => !p)}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="4" y1="4" x2="18" y2="18" />
              <line x1="18" y1="4" x2="4" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="3" y1="7" x2="19" y2="7" />
              <line x1="3" y1="11" x2="19" y2="11" />
              <line x1="3" y1="15" x2="19" y2="15" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile menu ───────────────────── */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--cream)] px-6 py-4 space-y-1 drawer">
          <MobileLink href="/" onClick={() => setMenuOpen(false)}>New Audit</MobileLink>
          <MobileLink href="/#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</MobileLink>
          <div className="pt-2">
            <p className="label mb-2">Workspaces</p>
            {workspaces.map((ws) => (
              <MobileLink
                key={ws.slug}
                href={`/workspaces/${ws.slug}`}
                onClick={() => setMenuOpen(false)}
              >
                {ws.name}
              </MobileLink>
            ))}
            {workspaces.length === 0 && (
              <p className="text-sm text-[var(--ink-muted)] px-2">No workspaces yet.</p>
            )}
          </div>
          <div className="pt-3">
            <Link
              href="/#begin-audit"
              onClick={() => setMenuOpen(false)}
              className="btn btn-primary w-full text-center text-sm block no-underline"
            >
              Start Audit ↗
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-2 text-sm transition-colors no-underline border-b-2",
        active
          ? "border-[var(--forest)] text-[var(--ink)] font-medium"
          : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]",
      )}
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-2 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--cream-dark)] no-underline rounded-sm transition-colors"
    >
      {children}
    </Link>
  );
}

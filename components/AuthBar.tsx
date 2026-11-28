"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

export function AuthBar({ compact = false }: { compact?: boolean }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-20 bg-[var(--bg-surface)] border border-[var(--border-hair)] rounded-[2px] animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/signin"
        className="px-3.5 py-1.5 text-[12px] font-medium text-[var(--ink-primary)] border border-[var(--border-elevated)] bg-[var(--bg-surface)] rounded-[2px] hover:border-[var(--accent-graphic)] hover:bg-[var(--bg-elevated)] no-underline transition-colors"
      >
        Sign In
      </Link>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "Account";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-elevated)] rounded-[2px] hover:border-[var(--accent-graphic)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="h-6 w-6 object-cover rounded-[2px] border border-[var(--border-elevated)]"
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center bg-[var(--cta-bg)] text-[var(--cta-text)] font-mono-tabular text-[10px] font-semibold rounded-[2px]">
            {initials}
          </span>
        )}
        {!compact && (
          <span className="text-[12px] text-[var(--ink-primary)] max-w-[130px] truncate">
            {displayName}
          </span>
        )}
        <ChevronDown size={13} className="text-[var(--ink-muted)]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            className="absolute right-0 top-full mt-1.5 w-52 bg-[var(--bg-elevated)] border border-[var(--border-elevated)] rounded-none z-50 divide-y divide-[var(--border-hair)]"
          >
            <div className="px-3.5 py-2.5">
              <p className="text-[12px] font-medium text-[var(--ink-primary)] truncate">
                {displayName}
              </p>
              {user.email && (
                <p className="font-mono-tabular text-[11px] text-[var(--ink-muted)] truncate">
                  {user.email}
                </p>
              )}
            </div>

            <div className="py-1">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] no-underline transition-colors"
              >
                <UserIcon size={14} className="text-[var(--ink-secondary)]" />
                View profile
              </Link>
            </div>

            <div className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                  router.push("/");
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-[var(--status-crimson)] hover:bg-[var(--status-crimson-bg)] cursor-pointer text-left transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

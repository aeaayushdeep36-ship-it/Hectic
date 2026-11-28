"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lock, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export function AuthPromptModal({
  open,
  onClose,
  actionLabel = "begin an audit",
}: {
  open: boolean;
  onClose: () => void;
  actionLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Sign in required"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-[var(--bg-canvas)]/80"
          />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-elevated)] rounded-none"
          >
            <div className="px-6 py-4 border-b border-[var(--border-hair)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[var(--accent-text)]" />
                <span className="font-mono-tabular text-[11px] uppercase tracking-[0.1em] text-[var(--accent-text)]">
                  SIGN IN REQUIRED
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close prompt"
                className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer p-1"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <h2 className="font-display text-[28px] leading-[1.1] text-[var(--ink-primary)]">
                Sign in to continue
              </h2>
              <p className="text-[13px] leading-[20px] text-[var(--ink-secondary)]">
                You must create an account or sign in before you can {actionLabel}.
                Your workspaces and audit statements are bound to your authenticated identity.
              </p>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-[12px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border border-[var(--border-elevated)] rounded-[2px] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <Link
                  href="/signin"
                  className="px-5 py-2 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[12px] font-medium rounded-[2px] hover:opacity-90 no-underline transition-opacity"
                >
                  Sign In / Create Account →
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

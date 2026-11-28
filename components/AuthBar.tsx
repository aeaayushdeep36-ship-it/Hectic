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
      <div className="h-8 w-20 bg-[#15181F] border border-[#1E222A] rounded-[2px] animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/signin"
        className="px-3.5 py-1.5 text-[12px] font-medium text-[#F5F6F8] border border-[#262B35] bg-[#0E1014] rounded-[2px] hover:border-[#D4AF6A] hover:bg-[#15181F] no-underline transition-colors"
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
        className="flex items-center gap-2.5 px-2.5 py-1 bg-[#0E1014] border border-[#262B35] rounded-[2px] hover:border-[#D4AF6A] hover:bg-[#15181F] cursor-pointer transition-colors"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="h-6 w-6 object-cover rounded-[2px] border border-[#262B35]"
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center bg-[#D4AF6A] text-[#07080A] font-mono-tabular text-[10px] font-semibold rounded-[2px]">
            {initials}
          </span>
        )}
        {!compact && (
          <span className="text-[12px] text-[#F5F6F8] max-w-[130px] truncate">
            {displayName}
          </span>
        )}
        <ChevronDown size={13} className="text-[#7D8CA3]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            className="absolute right-0 top-full mt-1.5 w-52 bg-[#0E1014] border border-[#262B35] rounded-none z-50 divide-y divide-[#1E222A]"
          >
            <div className="px-3.5 py-2.5">
              <p className="text-[12px] font-medium text-[#F5F6F8] truncate">
                {displayName}
              </p>
              {user.email && (
                <p className="font-mono-tabular text-[11px] text-[#7D8CA3] truncate">
                  {user.email}
                </p>
              )}
            </div>

            <div className="py-1">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-[#F5F6F8] hover:bg-[#15181F] no-underline transition-colors"
              >
                <UserIcon size={14} className="text-[#9CA3AF]" />
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
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-[#EF4444] hover:bg-[#2A1215] cursor-pointer text-left transition-colors"
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

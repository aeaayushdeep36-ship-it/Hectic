"use client";

import React, { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    setTheme(current);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("hectic-theme", next);
    } catch {
      // ignore storage errors
    }
  };

  const isLight = mounted && theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Switch to Obsidian dark mode" : "Switch to Alabaster light mode"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] border transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-graphic)]"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-hair)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke={isLight ? "#B89348" : "#64748B"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Radiance rays — visible ONLY when Light Mode is ON */}
        {isLight && (
          <g stroke="#B89348" strokeWidth="1.5">
            <line x1="12" y1="1.75" x2="12" y2="3.5" />
            <line x1="4.75" y1="4.75" x2="6" y2="6" />
            <line x1="19.25" y1="4.75" x2="18" y2="6" />
            <line x1="2.25" y1="11.5" x2="4" y2="11.5" />
            <line x1="20" y1="11.5" x2="21.75" y2="11.5" />
          </g>
        )}

        {/* Bulb glass — warm tinted fill when ON, hollow when OFF */}
        <path
          d="M9 17.5h6M9.5 20.5h5M12 6a5.5 5.5 0 0 0-3.5 9.74c.54.45.85 1.1.92 1.76h5.16c.07-.66.38-1.31.92-1.76A5.5 5.5 0 0 0 12 6Z"
          fill={isLight ? "rgba(184, 147, 72, 0.24)" : "none"}
        />
      </svg>
    </button>
  );
}

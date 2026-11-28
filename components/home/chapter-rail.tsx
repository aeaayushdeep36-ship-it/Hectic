"use client";

import { useEffect, useState } from "react";
import { useLenis } from "./lenis-provider";

export interface ChapterItem {
  readonly id: string;
  readonly code: string;
  readonly label: string;
}

export const HOME_CHAPTERS: readonly ChapterItem[] = [
  { id: "hero", code: "01", label: "Overview" },
  { id: "problem", code: "02", label: "The Problem" },
  { id: "pipeline", code: "03", label: "The Pipeline" },
  { id: "methodology", code: "04", label: "Methodology" },
  { id: "guarantees", code: "05", label: "Guarantees" },
  { id: "launcher", code: "06", label: "Audit Launcher" },
];

export function ChapterRail() {
  const { scrollTo } = useLenis();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function updateActiveChapter() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;

      // Always snap to 01 at the very top and 06 at the bottom of the document.
      if (scrollTop <= 24) {
        setActiveIndex(0);
        return;
      }
      if (winHeight + scrollTop >= docHeight - 24) {
        setActiveIndex(HOME_CHAPTERS.length - 1);
        return;
      }

      const anchorY = winHeight * 0.42;
      let current = 0;
      for (let i = 0; i < HOME_CHAPTERS.length; i++) {
        const el = document.getElementById(HOME_CHAPTERS[i]!.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= anchorY) {
          current = i;
        }
      }
      setActiveIndex(current);
    }

    updateActiveChapter();
    window.addEventListener("scroll", updateActiveChapter, { passive: true });
    window.addEventListener("resize", updateActiveChapter, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateActiveChapter);
      window.removeEventListener("resize", updateActiveChapter);
    };
  }, []);

  const currentCode = HOME_CHAPTERS[activeIndex]?.code ?? "01";

  return (
    <aside
      aria-label="Section progress"
      className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-5 select-none"
    >
      <div className="flex flex-col items-center gap-2">
        {HOME_CHAPTERS.map((ch, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => scrollTo(`#${ch.id}`, { duration: 1.1 })}
              aria-label={`Jump to ${ch.label}`}
              className="py-0.5 px-2 cursor-pointer group"
            >
              <span
                className={`block w-[2px] transition-all duration-300 ${
                  isActive
                    ? "h-6 bg-[#D4AF6A]"
                    : "h-3 bg-white/15 group-hover:bg-white/40"
                }`}
              />
            </button>
          );
        })}
      </div>

      <span
        className="font-mono-tabular text-[11px] tracking-[0.14em] text-[#9CA3AF]"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {currentCode} / 06
      </span>
    </aside>
  );
}

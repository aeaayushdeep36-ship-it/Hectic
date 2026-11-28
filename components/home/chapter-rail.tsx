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
    const elements = HOME_CHAPTERS.map((ch) => document.getElementById(ch.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = -1;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= bestRatio) {
            const idx = HOME_CHAPTERS.findIndex((ch) => ch.id === entry.target.id);
            if (idx !== -1) {
              bestRatio = entry.intersectionRatio;
              bestIndex = idx;
            }
          }
        }
        if (bestIndex !== -1) {
          setActiveIndex(bestIndex);
        }
      },
      {
        rootMargin: "-25% 0px -35% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
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

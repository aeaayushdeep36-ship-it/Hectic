"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function updateRail() {
      const scrollTop = window.scrollY;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
      setProgress(ratio);

      if (scrollTop <= 24) {
        setActiveIndex(0);
        return;
      }
      if (window.innerHeight + scrollTop >= document.documentElement.scrollHeight - 24) {
        setActiveIndex(HOME_CHAPTERS.length - 1);
        return;
      }

      const anchorY = window.innerHeight * 0.42;
      let current = 0;
      for (let i = 0; i < HOME_CHAPTERS.length; i++) {
        const el = document.getElementById(HOME_CHAPTERS[i]!.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= anchorY) {
          current = i;
        }
      }
      setActiveIndex(current);
    }

    updateRail();
    window.addEventListener("scroll", updateRail, { passive: true });
    window.addEventListener("resize", updateRail, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateRail);
      window.removeEventListener("resize", updateRail);
    };
  }, []);

  const scrubToClientY = useCallback(
    (clientY: number, immediate: boolean) => {
      const track = trackRef.current;
      if (!track || typeof window === "undefined") return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const targetY = ratio * maxScroll;
      if (immediate) {
        window.scrollTo({ top: targetY, behavior: "auto" });
      } else {
        scrollTo(targetY, { duration: 0.75 });
      }
    },
    [scrollTo],
  );

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    scrubToClientY(e.clientY, false);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    scrubToClientY(e.clientY, true);
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  }

  const currentCode = HOME_CHAPTERS[activeIndex]?.code ?? "01";
  const pct = `${(progress * 100).toFixed(2)}%`;

  return (
    <aside
      aria-label="Scroll progress"
      className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-30 items-center select-none"
    >
      <div
        ref={trackRef}
        role="slider"
        aria-label="Document scroll position"
        aria-valuemin={1}
        aria-valuemax={HOME_CHAPTERS.length}
        aria-valuenow={activeIndex + 1}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-12 h-[280px] flex justify-center cursor-pointer touch-none"
      >
        {/* Subtle vertical track */}
        <div className="w-[1px] h-full bg-[var(--border-hair)]" />

        {/* Gold thread from top down to diamond */}
        <div
          className="absolute top-0 w-[1.5px]"
          style={{ height: pct, backgroundColor: "var(--accent-graphic)" }}
        />

        {/* Faceted Gold Diamond + Chapter Code */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center pointer-events-none"
          style={{ top: pct }}
        >
          <span
            className="block h-3 w-3 rotate-45 border border-[var(--accent-graphic)]"
            style={{ backgroundColor: "var(--accent-graphic)" }}
          />
          <span className="absolute left-5 font-mono-tabular text-[11px] tracking-[0.08em] text-[var(--ink-secondary)]">
            {currentCode}
          </span>
        </div>
      </div>
    </aside>
  );
}

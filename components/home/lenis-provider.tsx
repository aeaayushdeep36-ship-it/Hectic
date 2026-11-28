"use client";

import Lenis from "lenis";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

interface LenisContextValue {
  scrollTo: (target: string | number, options?: { duration?: number; offset?: number }) => void;
}

const LenisContext = createContext<LenisContextValue>({
  scrollTo: (target) => {
    if (typeof window === "undefined") return;
    if (typeof target === "number") {
      window.scrollTo({ top: target, behavior: "smooth" });
      return;
    }
    const el = document.querySelector(target);
    el?.scrollIntoView({ behavior: "smooth" });
  },
});

export function useLenis(): LenisContextValue {
  return useContext(LenisContext);
}

export function LenisProvider({ children }: { readonly children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 0.9,
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    }
    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollTo = useCallback(
    (target: string | number, options?: { duration?: number; offset?: number }) => {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, {
          duration: options?.duration ?? 1.15,
          offset: options?.offset ?? 0,
        });
        return;
      }
      if (typeof window === "undefined") return;
      if (typeof target === "number") {
        window.scrollTo({ top: target, behavior: "auto" });
        return;
      }
      const el = document.querySelector(target);
      el?.scrollIntoView({ behavior: "auto" });
    },
    [],
  );

  return (
    <LenisContext.Provider value={{ scrollTo }}>
      {children}
    </LenisContext.Provider>
  );
}

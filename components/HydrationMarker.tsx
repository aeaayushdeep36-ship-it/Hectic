"use client";

import { useEffect, useState } from "react";

/**
 * Server-rendered HTML is visible before React attaches handlers. E2E tests
 * wait for this marker so a fill or click can never race hydration.
 */
export function HydrationMarker() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return <span hidden aria-hidden="true" data-hydrated={ready ? "true" : "false"} />;
}

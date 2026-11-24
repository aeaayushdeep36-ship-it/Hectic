/** Server-only bridge: pages get engine-derived targets without importing engine/. */

import { nextTarget } from "../engine/thresholds";
import type { EvidenceLevel } from "../lib/types";

export function nextLevelTarget(level: EvidenceLevel): number {
  return nextTarget(level);
}

/**
 * Roster import. Papa Parse handles the messy CSV; Zod rejects bad rows
 * individually so one broken line cannot destroy the whole roster.
 */

import Papa from "papaparse";
import type { EvidenceRow } from "./types";
import { evidenceRowSchema } from "./schemas";

export interface RowError {
  readonly line: number;
  readonly message: string;
}

export interface ImportResult {
  readonly rows: EvidenceRow[];
  readonly errors: RowError[];
}

export function parseRoster(text: string): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const rows: EvidenceRow[] = [];
  const errors: RowError[] = [];

  for (const [index, raw] of parsed.data.entries()) {
    const candidate = {
      id: raw.id?.trim(),
      orgId: raw.orgId?.trim(),
      alias: raw.alias?.trim(),
      segment: raw.segment?.trim(),
      role: raw.role?.trim().toLowerCase(),
      channel: raw.channel?.trim(),
      relationship: raw.relationship?.trim(),
      evidenceType: Number(raw.evidenceType),
      date: raw.date?.trim(),
      durationMin:
        raw.durationMin === undefined || raw.durationMin.trim() === ""
          ? null
          : Number(raw.durationMin),
      notes: raw.notes ?? "",
    };

    const result = evidenceRowSchema.safeParse(candidate);
    if (result.success) {
      rows.push(result.data);
    } else {
      errors.push({
        line: index + 2,
        message: result.error.issues.map((issue) => issue.message).join("; "),
      });
    }
  }

  for (const parseError of parsed.errors) {
    errors.push({
      line: (parseError.row ?? 0) + 2,
      message: parseError.message,
    });
  }

  return { rows, errors };
}

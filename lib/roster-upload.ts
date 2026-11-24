/**
 * Client-side roster validation for the upload zone. The limits and required
 * columns mirror server/store.ts and lib/csv.ts so the preview can never
 * promise an import the backend will reject.
 */

import Papa from "papaparse";
import { parseRoster } from "./csv";

export const ROSTER_REQUIRED_COLUMNS = [
  "id",
  "orgId",
  "alias",
  "segment",
  "role",
  "channel",
  "relationship",
  "evidenceType",
  "date",
] as const;

export const MAX_ROSTER_FILE_BYTES = 2_000_000;
export const MAX_ROSTER_ROWS = 500;

/** The minimum surface of File needed by the validator (keeps tests pure). */
export interface RosterUploadSource {
  readonly name: string;
  readonly size: number;
  text(): Promise<string>;
}

export interface RosterUploadPreview {
  readonly fileName: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly rowCount: number;
  readonly invalidRowCount: number;
  readonly csv: string;
}

export type RosterUploadErrorCode =
  | "EMPTY_FILE"
  | "INVALID_TYPE"
  | "FILE_TOO_LARGE"
  | "MISSING_COLUMNS"
  | "PARSE_FAILED"
  | "NO_ROWS"
  | "TOO_MANY_ROWS"
  | "INVALID_ROWS";

export class RosterUploadError extends Error {
  readonly code: RosterUploadErrorCode;

  constructor(code: RosterUploadErrorCode, message: string) {
    super(message);
    this.name = "RosterUploadError";
    this.code = code;
  }
}

/** Validate pasted CSV text with the exact same rules as a file upload. */
export function parseRosterText(
  csv: string,
  fileName = "pasted-roster.csv",
): Promise<RosterUploadPreview> {
  return parseRosterUpload({
    name: fileName,
    size: new TextEncoder().encode(csv).length,
    text: async () => csv,
  });
}

export async function parseRosterUpload(
  source: RosterUploadSource,
): Promise<RosterUploadPreview> {
  if (source.size === 0) {
    throw new RosterUploadError("EMPTY_FILE", "This file is empty. Choose a CSV with roster rows.");
  }
  if (!/\.csv$/i.test(source.name)) {
    throw new RosterUploadError("INVALID_TYPE", "Please upload a valid CSV file.");
  }
  if (source.size > MAX_ROSTER_FILE_BYTES) {
    throw new RosterUploadError(
      "FILE_TOO_LARGE",
      `The file is too large (max ${MAX_ROSTER_FILE_BYTES / 1_000_000}MB).`,
    );
  }

  const csv = await source.text();
  if (csv.trim().length === 0) {
    throw new RosterUploadError("EMPTY_FILE", "This file is empty. Choose a CSV with roster rows.");
  }

  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length > 0) {
    throw new RosterUploadError(
      "PARSE_FAILED",
      `Error parsing CSV. ${parsed.errors[0]?.message ?? "Please check the format."}`,
    );
  }

  const headers = parsed.meta.fields ?? [];
  const missing = ROSTER_REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    throw new RosterUploadError(
      "MISSING_COLUMNS",
      `Missing required columns: ${missing.join(", ")}.`,
    );
  }

  const rowCount = parsed.data.length;
  if (rowCount === 0) {
    throw new RosterUploadError("NO_ROWS", "No roster rows found in this CSV.");
  }
  if (rowCount > MAX_ROSTER_ROWS) {
    throw new RosterUploadError(
      "TOO_MANY_ROWS",
      `Too many rows (max ${MAX_ROSTER_ROWS}).`,
    );
  }

  const validated = parseRoster(csv);
  if (validated.rows.length === 0) {
    const firstError = validated.errors[0]?.message ?? "Please check the values.";
    throw new RosterUploadError("INVALID_ROWS", `No valid roster rows found. ${firstError}`);
  }

  return {
    fileName: source.name,
    headers,
    rows: parsed.data.map((row) => headers.map((header) => row[header] ?? "")),
    rowCount,
    invalidRowCount: validated.errors.length,
    csv,
  };
}

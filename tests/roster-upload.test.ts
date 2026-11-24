import { describe, expect, it } from "vitest";
import {
  MAX_ROSTER_FILE_BYTES,
  MAX_ROSTER_ROWS,
  parseRosterUpload,
  RosterUploadError,
  type RosterUploadSource,
} from "../lib/roster-upload";

const HEADER =
  "id,orgId,alias,segment,role,channel,relationship,evidenceType,date,durationMin,notes";
const ROW =
  "upload-1,upload-org-1,ZZ,SMB retail,economic,linkedin,cold,2,2026-03-01,25,Asked about pricing";

function source(name: string, text: string): RosterUploadSource {
  return {
    name,
    size: Buffer.byteLength(text, "utf8"),
    text: async () => text,
  };
}

function errorCode(error: unknown): string | undefined {
  return error instanceof RosterUploadError ? error.code : undefined;
}

describe("roster upload zone", () => {
  it("parses a valid CSV and previews real rows", async () => {
    const preview = await parseRosterUpload(source("roster.csv", `${HEADER}\n${ROW}`));

    expect(preview.fileName).toBe("roster.csv");
    expect(preview.rowCount).toBe(1);
    expect(preview.invalidRowCount).toBe(0);
    expect(preview.headers).toContain("orgId");
    expect(preview.rows[0]).toContain("upload-org-1");
    expect(preview.csv).toContain(ROW);
  });

  it("rejects a 0-byte file", async () => {
    const upload: RosterUploadSource = {
      name: "empty.csv",
      size: 0,
      text: async () => "",
    };

    await expect(parseRosterUpload(upload)).rejects.toMatchObject({
      code: "EMPTY_FILE",
    });
  });

  it("rejects a .txt file", async () => {
    await expect(parseRosterUpload(source("notes.txt", `${HEADER}\n${ROW}`))).rejects.toMatchObject({
      code: "INVALID_TYPE",
    });
  });

  it("rejects a CSV with missing columns", async () => {
    const error = await parseRosterUpload(source("thin.csv", "id,orgId\nu1,o1")).catch(
      (caught: unknown) => caught,
    );

    expect(errorCode(error)).toBe("MISSING_COLUMNS");
    expect((error as Error).message).toContain("alias");
    expect((error as Error).message).toContain("evidenceType");
  });

  it("rejects an oversized CSV", async () => {
    const upload: RosterUploadSource = {
      name: "large.csv",
      size: MAX_ROSTER_FILE_BYTES + 1,
      text: async () => "",
    };

    await expect(parseRosterUpload(upload)).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
  });

  it("rejects more than the backend row limit", async () => {
    const rows = Array.from(
      { length: MAX_ROSTER_ROWS + 1 },
      (_, index) =>
        `upload-${index},upload-org-${index},ZZ,SMB retail,economic,linkedin,cold,2,2026-03-01,25,Asked about pricing`,
    );

    await expect(
      parseRosterUpload(source("many.csv", [HEADER, ...rows].join("\n"))),
    ).rejects.toMatchObject({ code: "TOO_MANY_ROWS" });
  });

  it("reports an accessible reason when no row validates", async () => {
    const invalid = `${HEADER}\nupload-1,upload-org-1,ZZ,SMB retail,not-a-role,linkedin,cold,2,2026-03-01,25,Notes`;

    await expect(parseRosterUpload(source("bad-rows.csv", invalid))).rejects.toMatchObject({
      code: "INVALID_ROWS",
    });
  });
});

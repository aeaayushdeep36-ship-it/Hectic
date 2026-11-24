import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvLocal } from "../lib/env";

const KEYS = ["HECTIC_ENV_TEST_A", "HECTIC_ENV_TEST_B", "HECTIC_ENV_TEST_EMPTY"];

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("loadEnvLocal", () => {
  it("loads quoted values and skips comments, malformed lines and empty keys", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "hectic-env-"));
    try {
      const file = path.join(dir, ".env.local");
      writeFileSync(
        file,
        [
          "# comment",
          "HECTIC_ENV_TEST_A=plain",
          'HECTIC_ENV_TEST_B="quoted value"',
          "HECTIC_ENV_TEST_EMPTY=",
          "NO_SEPARATOR",
          "=missing-key",
        ].join("\n"),
      );

      loadEnvLocal(file);

      expect(process.env.HECTIC_ENV_TEST_A).toBe("plain");
      expect(process.env.HECTIC_ENV_TEST_B).toBe("quoted value");
      expect(process.env.HECTIC_ENV_TEST_EMPTY).toBe("");
      expect(process.env.NO_SEPARATOR).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("never overwrites an existing process environment value", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "hectic-env-"));
    try {
      const file = path.join(dir, ".env.local");
      writeFileSync(file, "HECTIC_ENV_TEST_A=from-file\n");
      process.env.HECTIC_ENV_TEST_A = "from-process";

      loadEnvLocal(file);

      expect(process.env.HECTIC_ENV_TEST_A).toBe("from-process");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does nothing when the file is absent", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "hectic-env-"));
    try {
      loadEnvLocal(path.join(dir, "missing.env"));
      expect(process.env.HECTIC_ENV_TEST_A).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

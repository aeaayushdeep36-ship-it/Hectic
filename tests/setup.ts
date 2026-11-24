/**
 * Store tests must never touch the developer's real hectic.db. Point every
 * worker at an isolated file before any module (notably db/client.ts) loads.
 */
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.HECTIC_DB ??= path.join(
  mkdtempSync(path.join(os.tmpdir(), "hectic-test-")),
  "hectic.db",
);

/**
 * Deletes the local SQLite file (and its WAL/SHM sidecars) so the next seed
 * replays every migration from scratch, including the export-gate trigger.
 */
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const file = process.env.HECTIC_DB ?? path.join(process.cwd(), "hectic.db");
for (const candidate of [file, `${file}-wal`, `${file}-shm`]) {
  if (existsSync(candidate)) {
    rmSync(candidate);
    console.log(`Removed ${path.basename(candidate)}.`);
  }
}

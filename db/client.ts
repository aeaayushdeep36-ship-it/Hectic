import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const databaseFile = process.env.HECTIC_DB ?? path.join(process.cwd(), "hectic.db");

type Db = ReturnType<typeof create>;

function create() {
  const sqlite = new Database(databaseFile);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const migrations = path.join(process.cwd(), "drizzle");
  if (existsSync(path.join(migrations, "meta", "_journal.json"))) {
    migrate(drizzle(sqlite, { schema }), { migrationsFolder: migrations });
  }

  return { sqlite, db: drizzle(sqlite, { schema }) };
}

const globalForDb = globalThis as unknown as { hectic?: Db };
const instance = globalForDb.hectic ?? create();
if (process.env.NODE_ENV !== "production") globalForDb.hectic = instance;

export const db = instance.db;
export const sqlite = instance.sqlite;

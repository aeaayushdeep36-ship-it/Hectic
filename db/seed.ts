/** CLI entry point: seed the local database from the hand-computed fixtures. */
import path from "node:path";
import { sqlite } from "./client";
import { seedDatabase } from "./seed-data";

const databaseFile = process.env.HECTIC_DB ?? path.join(process.cwd(), "hectic.db");
const count = seedDatabase();
console.log(`Seeded ${count} demo workspaces into ${databaseFile}.`);
sqlite.close();

/**
 * Placeholder until the schema lands in week 2. It removes the local database
 * so a clean install starts from nothing; it does not pretend to seed yet.
 */
import { existsSync, rmSync } from "node:fs";

const file = "hectic.db";
if (existsSync(file)) {
  rmSync(file);
  console.log(`Removed ${file}.`);
} else {
  console.log("No local database to remove.");
}
console.log("Schema and demo seeding are scheduled for week 2.");

/**
 * The server's one doorway into the pure engine. Re-exports only; the store
 * never reaches past this file, which makes the boundary auditable.
 */
export {
  ENGINE_VERSION,
  THRESHOLD_VERSION,
  buildCoverage,
  buildFinding,
  explain,
  isInPopulation,
} from "../engine/index";
export { verdictHash } from "../lib/hash";

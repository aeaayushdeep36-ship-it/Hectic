/**
 * E3 — in-memory LRU cache of successful, schema-validated completions.
 *
 * The key includes agent, provider, model, prompt version and the exact
 * redacted payload. A cache hit costs zero provider calls. Nothing is cached
 * until the calling agent has validated the response against its Zod schema.
 */
import { contentHash } from "../lib/hash";

export interface CacheStats {
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
  readonly entries: number;
}

const MAX_ENTRIES = 256;
const store = new Map<string, string>();
let hits = 0;
let misses = 0;
let entries = 0;

export function cacheKey(parts: readonly unknown[]): string {
  return contentHash(parts);
}

export function getCached(key: string): string | undefined {
  const value = store.get(key);
  if (value === undefined) {
    misses += 1;
    return undefined;
  }
  // Refresh insertion order so the least recently used entry is evicted first.
  store.delete(key);
  store.set(key, value);
  hits += 1;
  return value;
}

export function putCached(key: string, value: string): void {
  if (store.has(key)) store.delete(key);
  store.set(key, value);
  entries += 1;
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

export function clearCache(): void {
  store.clear();
  hits = 0;
  misses = 0;
  entries = 0;
}

export function cacheStats(): CacheStats {
  return { size: store.size, hits, misses, entries };
}

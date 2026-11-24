/**
 * E2 — bounded retry with exponential backoff and jitter.
 *
 * Only transient failures are retried: HTTP 429, HTTP 5xx, timeouts and a
 * provider being unreachable. A malformed JSON response is handled by the
 * agent's schema fallback, not by burning the free-tier quota on a retry.
 */
import type { Completion, Provider } from "./index";

export interface RetryOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitter?: number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly random?: () => number;
  readonly onRetry?: (reason: string, attempt: number, delayMs: number) => void;
}

export const DEFAULT_RETRY_OPTIONS: Required<
  Pick<RetryOptions, "maxRetries" | "baseDelayMs" | "maxDelayMs" | "jitter">
> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  jitter: 0.2,
};

export function isRetryable(code: string | null): boolean {
  if (code === null) return false;
  return (
    code === "HTTP_429" ||
    code === "TIMEOUT" ||
    code === "PROVIDER_UNAVAILABLE" ||
    /^HTTP_5\d\d$/.test(code)
  );
}

function delayFor(
  attempt: number,
  options: Required<Pick<RetryOptions, "baseDelayMs" | "maxDelayMs" | "jitter">>,
  random: () => number,
): number {
  const exponential = options.baseDelayMs * 2 ** attempt;
  const capped = Math.min(exponential, options.maxDelayMs);
  const jitterFactor = 1 + (random() * 2 - 1) * options.jitter;
  return Math.max(0, Math.round(capped * jitterFactor));
}

/**
 * Returns the last completion after retries are exhausted. Agents decide what
 * to do with it; this helper never fabricates a successful completion.
 */
export async function completeWithRetry(
  provider: Provider,
  system: string,
  user: string,
  options: RetryOptions = {},
): Promise<Completion> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const maxRetries = options.maxRetries ?? config.maxRetries;

  let completion = await provider.complete(system, user);
  for (let attempt = 0; attempt < maxRetries && !completion.ok && isRetryable(completion.errorCode); attempt += 1) {
    const backoffMs = delayFor(attempt, config, random);
    const delayMs = completion.retryAfterMs
      ? Math.min(Math.max(backoffMs, completion.retryAfterMs), config.maxDelayMs)
      : backoffMs;
    options.onRetry?.(completion.errorCode ?? "UNKNOWN", attempt + 1, delayMs);
    await sleep(delayMs);
    completion = await provider.complete(system, user);
  }
  return completion;
}

/** Convenience wrapper so every agent step gets the same policy. */
export function retryingProvider(provider: Provider, options: RetryOptions = {}): Provider {
  return {
    id: provider.id,
    modelId: provider.modelId,
    get callCount() {
      return provider.callCount;
    },
    complete: (system: string, user: string) => completeWithRetry(provider, system, user, options),
  };
}

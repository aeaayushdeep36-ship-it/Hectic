/**
 * Test-only provider that injects 429s, timeouts and malformed JSON at a
 * configurable, seeded rate. Deterministic so a failure reproduces exactly.
 */
import type { Completion, Provider } from "./index";

export interface ChaosOptions {
  readonly rate429?: number;
  readonly timeoutRate?: number;
  readonly malformedRate?: number;
  readonly seed?: number;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export class ChaosProvider implements Provider {
  readonly id = "chaos" as const;
  readonly modelId = "chaos-v1";
  callCount = 0;
  private readonly random: () => number;
  private readonly injected: string[] = [];

  constructor(
    private readonly inner: Provider = { id: "mock", modelId: "mock-v1", complete: async () => ({
      text: "{}",
      promptTokens: null,
      outputTokens: null,
      latencyMs: 0,
      ok: true,
      errorCode: null,
    }) },
    private readonly options: ChaosOptions = {},
  ) {
    this.random = mulberry32(options.seed ?? 1);
  }

  get injections(): readonly string[] {
    return this.injected;
  }

  async complete(system: string, user: string): Promise<Completion> {
    this.callCount += 1;
    const roll = this.random();
    const r429 = this.options.rate429 ?? 0;
    const timeout = this.options.timeoutRate ?? 0;
    const malformed = this.options.malformedRate ?? 0;

    const start = Date.now();
    const failure = (text: string, errorCode: string): Completion => ({
      text,
      promptTokens: null,
      outputTokens: null,
      latencyMs: Date.now() - start,
      ok: false,
      errorCode,
    });

    if (roll < r429) {
      this.injected.push("HTTP_429");
      return failure("{}", "HTTP_429");
    }
    if (roll < r429 + timeout) {
      this.injected.push("TIMEOUT");
      return failure("{}", "TIMEOUT");
    }
    if (roll < r429 + timeout + malformed) {
      this.injected.push("MALFORMED_JSON");
      return {
        text: "not json",
        promptTokens: null,
        outputTokens: null,
        latencyMs: Date.now() - start,
        ok: true,
        errorCode: null,
      };
    }
    return this.inner.complete(system, user);
  }
}

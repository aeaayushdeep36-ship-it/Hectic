/**
 * Provider adapter. Only free-tier or open-weight runtimes are permitted by
 * the Equal Access AI Policy. The mock is the default and needs no key.
 *
 * No provider module is imported by engine/, app/ or any client component.
 */
import { heuristicTag, templateProposal } from "../lib/heuristics";
import { MODEL_BY_PROVIDER, type ProviderIdOption } from "../lib/provider-options";
import type { Claim, EvidenceRow } from "../lib/types";

export type ProviderId = ProviderIdOption | "chaos";

export interface Completion {
  readonly text: string;
  readonly promptTokens: number | null;
  readonly outputTokens: number | null;
  readonly latencyMs: number;
  readonly ok: boolean;
  readonly errorCode: string | null;
  /** Upstream `Retry-After` hint in milliseconds, when the gateway supplies one. */
  readonly retryAfterMs?: number;
}

export interface Provider {
  readonly id: ProviderId;
  readonly modelId: string;
  /** Number of complete() attempts, including retries. Optional for fakes. */
  readonly callCount?: number;
  complete(system: string, user: string): Promise<Completion>;
}

const ALLOWED: Readonly<Record<ProviderId, string>> = {
  ...MODEL_BY_PROVIDER,
  chaos: "chaos-v1",
};

function parseEnvelope(user: string): Record<string, unknown> | null {
  const match = user.match(/^<evidence>([\s\S]*)<\/evidence>$/);
  if (!match) return null;
  try {
    const inner: unknown = JSON.parse(match[1]!);
    if (typeof inner === "string") return JSON.parse(inner) as Record<string, unknown>;
    return inner as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Tolerant JSON extraction for real gateways. An open-weight model may wrap its
 * answer in a Markdown fence or a sentence of prose; neither is a schema
 * violation until the parsed value fails Zod. No code is evaluated here.
 */
export function parseModelJson(text: string): unknown | null {
  const trimmed = text.trim();
  const candidates: string[] = [];
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence?.[1]) candidates.push(fence[1].trim());
  candidates.push(trimmed);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next form.
    }
  }

  // Last resort: the outermost JSON object or array, with surrounding prose
  // discarded. A malformed or truncated body still returns null.
  const first = trimmed.search(/[[{]/);
  if (first >= 0) {
    const isObject = trimmed[first] === "{";
    const last = trimmed.lastIndexOf(isObject ? "}" : "]");
    if (last > first) {
      try {
        return JSON.parse(trimmed.slice(first, last + 1));
      } catch {
        // Not valid JSON either.
      }
    }
  }
  return null;
}

/**
 * E4 — an offline stand-in that behaves like the schema-constrained model.
 *
 * It routes on the system prompt and returns the same deterministic output
 * the golden fixtures expect: a formalisation object, an array of relevance
 * tags, or a rephrased verdict with no new digits. Unknown prompts fall back
 * to extracting the first JSON object, so the old stub behaviour is retained
 * for prompts that have no golden contract.
 */
export class MockProvider implements Provider {
  readonly id = "mock" as const;
  readonly modelId = ALLOWED.mock;
  callCount = 0;

  async complete(system: string, user: string): Promise<Completion> {
    const start = Date.now();
    this.callCount += 1;
    const payload = parseEnvelope(user);
    let text: string | null = null;

    if (payload && /decide relevance/i.test(system)) {
      const predicate = String(payload.predicate ?? "");
      const claimId = String(payload.claimId ?? "");
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      text = JSON.stringify(
        rows.map((entry) => {
          const row = entry as Partial<EvidenceRow> & { evidenceId?: string };
          const evidenceId = String(row.evidenceId ?? row.id ?? "");
          return heuristicTag(String(row.notes ?? ""), predicate, evidenceId, claimId);
        }),
      );
    } else if (payload && /convert a founder's belief|claim formaliser/i.test(system)) {
      text = JSON.stringify(templateProposal(String(payload.rawText ?? "")));
    } else if (payload && /rephrase the given verdict/i.test(system)) {
      // The verdict is already computed; the mock may only pass it through.
      const verdictValue = payload.verdict;
      const verdict =
        typeof verdictValue === "string"
          ? verdictValue
          : String((verdictValue as { text?: string })?.text ?? "");
      text = JSON.stringify({ text: verdict });
    }

    if (text === null) {
      const match = user.match(/\{[\s\S]*\}/);
      text = match?.[0] ?? "{}";
    }

    return {
      text,
      promptTokens: null,
      outputTokens: null,
      latencyMs: Date.now() - start,
      ok: true,
      errorCode: null,
    };
  }
}

interface HttpOptions {
  /** Open-weight gateways do not all support OpenAI's json_object mode. */
  readonly jsonMode?: boolean;
  readonly headers?: Readonly<Record<string, string>>;
}

function parseRetryAfter(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(raw);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : undefined;
}

class OpenAiCompatibleProvider implements Provider {
  callCount = 0;

  constructor(
    readonly id: ProviderId,
    readonly modelId: string,
    private readonly baseUrl: string,
    private readonly apiKey: string | null,
    private readonly http: HttpOptions = {},
  ) {}

  async complete(system: string, user: string): Promise<Completion> {
    const start = Date.now();
    this.callCount += 1;
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...this.http.headers,
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.modelId,
          // Gemma 4 on OpenRouter is open-weight: ask for JSON in the prompt
          // and validate with Zod rather than relying on a gateway-specific mode.
          ...(this.http.jsonMode === false ? {} : { response_format: { type: "json_object" } }),
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        return {
          text: "{}",
          promptTokens: null,
          outputTokens: null,
          latencyMs: Date.now() - start,
          ok: false,
          errorCode: `HTTP_${response.status}`,
          ...(response.status === 429
            ? { retryAfterMs: parseRetryAfter(response.headers.get("retry-after")) }
            : {}),
        };
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        text: body.choices?.[0]?.message?.content ?? "{}",
        promptTokens: body.usage?.prompt_tokens ?? null,
        outputTokens: body.usage?.completion_tokens ?? null,
        latencyMs: Date.now() - start,
        ok: true,
        errorCode: null,
      };
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      return {
        text: "{}",
        promptTokens: null,
        outputTokens: null,
        latencyMs: Date.now() - start,
        ok: false,
        errorCode:
          name === "TimeoutError" || name === "AbortError"
            ? "TIMEOUT"
            : "PROVIDER_UNAVAILABLE",
      };
    }
  }
}

export function getProvider(
  requested: string | undefined = process.env.LLM_PROVIDER,
  modelId?: string,
  apiKey?: string,
): Provider {
  switch (requested) {
    case "gemini":
      return new OpenAiCompatibleProvider(
        "gemini",
        modelId || process.env.GEMINI_MODEL || ALLOWED.gemini,
        "https://generativelanguage.googleapis.com/v1beta/openai",
        process.env.GEMINI_API_KEY ?? null,
        // A2 returns an array; OpenAI-style json_object mode rejects arrays on
        // several gateways. The Zod schemas are the actual contract.
        { jsonMode: false },
      );
    case "groq":
      return new OpenAiCompatibleProvider(
        "groq",
        modelId || process.env.GROQ_MODEL || ALLOWED.groq,
        "https://api.groq.com/openai/v1",
        process.env.GROQ_API_KEY ?? null,
        { jsonMode: false },
      );
    case "ollama":
      return new OpenAiCompatibleProvider(
        "ollama",
        ALLOWED.ollama,
        process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1",
        null,
      );
    case "openrouter":
      // The key stays server-side. Only the provider id crosses the client boundary.
      return new OpenAiCompatibleProvider(
        "openrouter",
        modelId || process.env.OPENROUTER_MODEL || ALLOWED.openrouter,
        "https://openrouter.ai/api/v1",
        apiKey ?? process.env.OPENROUTER_API_KEY ?? null,
        {
          jsonMode: false,
          headers: {
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
            "X-Title": "Hectic evidence auditor",
          },
        },
      );
    default:
      return new MockProvider();
  }
}

/** The response schema intentionally has no numeric or verdict fields. */
export function wrapUserContent(content: string): string {
  return `<evidence>${JSON.stringify(content)}</evidence>`;
}

export { getCached, putCached, clearCache, cacheStats, cacheKey } from "./cache";
export { completeWithRetry, retryingProvider, isRetryable } from "./retry";
export { ChaosProvider } from "./chaos";
export type { ChaosOptions } from "./chaos";
export type { RetryOptions } from "./retry";

/** Convenience for the deterministic fallback helpers used by tests and evals. */
export function mockTag(notes: string, predicate: string, evidenceId: string, claimId: string) {
  return heuristicTag(notes, predicate, evidenceId, claimId);
}

export function mockProposal(rawText: string) {
  return templateProposal(rawText);
}

export type { Claim, EvidenceRow };

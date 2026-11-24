/**
 * Provider adapter. Only free-tier or open-weight runtimes are permitted by
 * the Equal Access AI Policy. The mock is the default and needs no key.
 *
 * No provider module is imported by engine/, app/ or any client component.
 */

export type ProviderId = "mock" | "gemini" | "groq" | "ollama";

export interface Completion {
  readonly text: string;
  readonly promptTokens: number | null;
  readonly outputTokens: number | null;
  readonly latencyMs: number;
  readonly ok: boolean;
  readonly errorCode: string | null;
}

export interface Provider {
  readonly id: ProviderId;
  readonly modelId: string;
  complete(system: string, user: string): Promise<Completion>;
}

const ALLOWED: Readonly<Record<ProviderId, string>> = {
  mock: "mock-v1",
  gemini: "gemini-2.0-flash-lite",
  groq: "llama-3.1-8b-instant",
  ollama: "qwen2.5:7b",
};

/** Deterministic stand-in: extracts the first JSON object from the user turn. */
class MockProvider implements Provider {
  readonly id = "mock" as const;
  readonly modelId = ALLOWED.mock;

  async complete(_system: string, user: string): Promise<Completion> {
    const start = Date.now();
    const match = user.match(/\{[\s\S]*\}/);
    return {
      text: match?.[0] ?? "{}",
      promptTokens: null,
      outputTokens: null,
      latencyMs: Date.now() - start,
      ok: true,
      errorCode: null,
    };
  }
}

class OpenAiCompatibleProvider implements Provider {
  constructor(
    readonly id: ProviderId,
    readonly modelId: string,
    private readonly baseUrl: string,
    private readonly apiKey: string | null,
  ) {}

  async complete(system: string, user: string): Promise<Completion> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.modelId,
          response_format: { type: "json_object" },
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
    } catch {
      return {
        text: "{}",
        promptTokens: null,
        outputTokens: null,
        latencyMs: Date.now() - start,
        ok: false,
        errorCode: "PROVIDER_UNAVAILABLE",
      };
    }
  }
}

export function getProvider(
  requested: string | undefined = process.env.LLM_PROVIDER,
): Provider {
  switch (requested) {
    case "gemini":
      return new OpenAiCompatibleProvider(
        "gemini",
        ALLOWED.gemini,
        "https://generativelanguage.googleapis.com/v1beta/openai",
        process.env.GEMINI_API_KEY ?? null,
      );
    case "groq":
      return new OpenAiCompatibleProvider(
        "groq",
        ALLOWED.groq,
        "https://api.groq.com/openai/v1",
        process.env.GROQ_API_KEY ?? null,
      );
    case "ollama":
      return new OpenAiCompatibleProvider(
        "ollama",
        ALLOWED.ollama,
        process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1",
        null,
      );
    default:
      return new MockProvider();
  }
}

/** The response schema intentionally has no numeric or verdict fields. */
export function wrapUserContent(content: string): string {
  return `<evidence>${JSON.stringify(content)}</evidence>`;
}

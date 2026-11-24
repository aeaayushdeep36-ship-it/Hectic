# AI Disclosure Statement

Hectic uses language models for four language tasks and refuses to use them for
the one task that matters. Full detail, including failure modes and known limits,
is in [RESPONSIBLE_AI.md](RESPONSIBLE_AI.md).

- **Runtime models (free-tier / open-weight only):** Gemini 2.0 Flash-Lite,
  Groq `llama-3.1-8b-instant`, Ollama `qwen2.5:7b`, plus an in-repo deterministic
  mock. No paid model, no secret in the repository.
- **Used for:** claim formalisation, relevance tagging, prose around computed
  findings, and statement composition.
- **Never used for:** levels, counts, scores, thresholds, binding constraints or
  verdicts. The engine is pure arithmetic in `engine/` and is structurally
  isolated from every provider.
- **Human oversight:** every formalised field must be confirmed; every relevance
  tag is visible and overridable; every non-supported claim needs a typed
  resolution and a 40-character falsifier before export.
- **Affected parties:** the founder's interviewees. Local-only processing,
  aliases, redaction before egress, no telemetry, no names in the export.
- **Development:** code, docs and copy were AI-assisted and reviewed against the
  specifications in `docs/`. Citations were fetched and checked, not assumed.

Hectic is an independent student project submitted to the AI Agents for Founders
Challenge. It is not affiliated with, endorsed by, or produced by HETIC.

# Fresh credential-free install check

Generated on 2026-11-25 from a copy of the working tree with `node_modules`,
`.next`, `.env.local`, database files and test output excluded.

```bash
npm ci
npx tsx -e "import { getProvider } from './providers'; const p = getProvider(); if (p.id !== 'mock') throw new Error('Expected mock default'); console.log(p.id + '/' + p.modelId);"
npx tsx scripts/demo-rehearse.ts
```

Observed:

- `npm ci` completed with no environment file and no provider keys.
- Default provider: `mock/mock-v1`.
- Rehearsal: `mock` PASS, `chaos` PASS with 7 retries, 4 template fallbacks and
  11 injected failures; golden verdict hash unchanged.
- Gemini, Groq, Ollama and OpenRouter were correctly reported as skipped without
  local configuration.

No dev server was started by this check.

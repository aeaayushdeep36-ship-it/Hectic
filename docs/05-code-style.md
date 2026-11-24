# 05 — Code Style

Conventions that exist to protect two things: the purity of `engine/`, and the ability of a stranger to audit the claim in sixty seconds.

---

## 1. Compiler settings (non-negotiable)

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "jsx": "preserve"
  }
}
```

`noUncheckedIndexedAccess` is the one people disable and shouldn't. Every `roster[i]` returning `Evidence | undefined` is exactly the class of bug that produces a wrong count, and wrong counts are the product's only failure mode that matters.

**`any` is banned.** `unknown` at boundaries, narrow with Zod or a type guard. ESLint: `@typescript-eslint/no-explicit-any: error`. If you need an escape hatch, `// eslint-disable-next-line` with a written reason, and it must not be in `engine/`.

---

## 2. Directory and file names

- Directories: `kebab-case`
- Modules: `kebab-case.ts`
- React components: `PascalCase.tsx`
- Tests: `*.test.ts` beside the module
- No `index.ts` barrels except at a package boundary — they hide the import graph and slow the build

```
engine/                ← package boundary: the only barrel is index.ts
  thresholds.ts
  coverage.ts
  verdict.ts
  explain.ts
  index.ts
agents/
  claim-formaliser.ts
  relevance-tagger.ts
  prompts/
    claim-formaliser.v3.md
app/
  workspaces/[slug]/
    page.tsx
    coverage-matrix.tsx
```

---

## 3. The `engine/` contract

```ts
// engine/verdict.ts
export function computeVerdict(input: VerdictInput): Verdict;
```

Rules, enforced by review and by a test that greps the directory:

| Rule | Reason |
|---|---|
| No `fetch`, `fs`, `process.env`, `Date.now()` | Non-determinism makes the integrity claim false |
| No randomness | Same |
| No imports from `react`, `drizzle`, `agents`, `providers` | Keeps it auditable in isolation |
| No mutation of arguments | Callers reuse inputs across hypotheses in tests |
| Total functions: every input returns a verdict | No `throw` for business conditions |
| Time passed in, never read | `now` is a parameter |

`Date.now()` being banned is the one that surprises people. It matters: a verdict computed at 23:00 on day 180 and one computed at 01:00 on day 181 must not differ. The run captures `now` once and passes it down.

---

## 4. Domain modelling

### 4.1 Branded types for things that must not be confused

```ts
type Level = 0 | 1 | 2 | 3;
type ClaimId = string & { readonly __brand: "ClaimId" };
type EvidenceId = string & { readonly __brand: "EvidenceId" };
```

A function taking `(claimId, evidenceId)` cannot be called with the arguments swapped. In a codebase where every bug is "counted the wrong things," argument confusion is the single most likely defect.

### 4.2 Result over exceptions

Business outcomes are values, not exceptions.

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function importCsv(text: string): Result<Evidence[], ImportError[]>;
```

`throw` is reserved for programmer error (impossible state, violated invariant). Everything a user can cause — bad CSV, unresolved findings, rate limit — is a `Result` or a typed error with a code.

### 4.3 Discriminated unions for findings

The verdict is a structured value, not a scalar. It has no single "score" field and the model has no field it could write into.

```ts
type EvidenceLevel = 1 | 2 | 3 | 4 | 5 | 6;   // Pattyn 2026
type Saturation = "insufficient" | "basic" | "code" | "meaning";
type Binding = "population" | "type" | "support";

type Verdict = {
  level: EvidenceLevel;
  support: number;                              // independent in-pop orgs at level
  breadth: number;                              // independent in-pop orgs at any level
  saturation: Saturation | null;                // theme claims only
  interval: readonly [number, number, number] | null;  // prevalence claims only
};

type Finding =
  | { kind: "SUPPORTED";        verdict: Verdict; claimed: EvidenceLevel }
  | { kind: "DOWNGRADE";        verdict: Verdict; claimed: EvidenceLevel; binding: Binding }
  | { kind: "IMPRECISE";        verdict: Verdict; claimed: EvidenceLevel; binding: Binding }
  | { kind: "WRONG_POPULATION"; verdict: Verdict; evidenceElsewhere: number }
  | { kind: "UNTOUCHED";        verdict: Verdict };
```

Never `{ status: string; data?: ... }`. Exhaustive `switch` with a `never` check means adding a finding type breaks the build at every place that must handle it — which is the point.

**Note the union shape:** `SUPPORTED` has no `binding`. A finding with nothing blocking it must not be able to render an action. The DB CHECK constraint mirrors this.

### 4.4 Zod at every boundary

Four boundaries only: CSV → `Evidence`, HTTP body → command, provider response → `ClaimProposal`, JSON column → typed.

```ts
const EvidenceRow = z.object({
  alias: z.string().min(1).max(40),
  interviewed_at: z.coerce.date(),
  budget_authority: z.enum(["economic","technical","user","influencer","none"]),
  relationship: z.enum(["stranger","acquaintance","friend","family","colleague"]),
  // ...
});
```

Parse once, at the edge. Inside the app, types are trusted. Do not re-validate in `engine/`.

---

## 5. Naming

| Thing | Convention | Example |
|---|---|---|
| Function | verb phrase | `computeCoverage`, `selectBindingConstraint` |
| Boolean | `is`/`has`/`can`/`should` | `hasEconomicBuyer`, `isWithinRecency` |
| Predicate on domain | noun + past participle | `isConfirmed`, `isOverridden` |
| Constant table | `SCREAMING_SNAKE` | `LEVEL_REQUIREMENTS` |
| Type | `PascalCase`, no `I` prefix | `CoverageCell`, not `ICoverageCell` |
| Enum-ish union | `PascalCase` members | `"WRONG_POPULATION"` |
| DB column | `snake_case` | `claimed_level` |
| TS field | `camelCase` | `claimedLevel` |

Domain vocabulary is fixed. Use these words and no synonyms:

**claim · evidence · requirement · finding · blocker · resolution · falsifier · level**

Not "hypothesis" (ambiguous with statistical testing), not "interview" in code (the DB table is `evidence`; the UI says "interview"), not "score" (there is no score).

---

## 6. Function shape

- Prefer ≤30 lines. The three exceptions are the threshold table, the Zod schemas, and JSX.
- One level of abstraction per function. `computeVerdict` composes; it does not loop.
- Max 3 positional parameters; beyond that, an object. `computeVerdict(input)` not `computeVerdict(claims, evidence, thresholds, now)`.
- No boolean parameters that change behaviour. `render(matrix, { compact: true })` yes; `render(matrix, true)` no.

---

## 7. Errors

```ts
class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly context?: Record<string, unknown>,
  ) { super(message); }
}
```

`ErrorCode` is a closed union: `IMPORT_INVALID` · `PROVIDER_UNAVAILABLE` · `AGENT_SCHEMA_VIOLATION` · `CALL_BUDGET_EXCEEDED` · `UNRESOLVED_FINDINGS` · `THRESHOLD_OVERRIDE_INVALID`.

Rules:
- Every user-visible error has a code, a sentence, and a next action.
- No error message contains a stack trace, a file path, or a provider response body.
- Log the context, show the code.

```
⚠  UNRESOLVED_FINDINGS
   3 claims need a decision before this can be exported.
   [ Review them ]
```

---

## 8. Comments

Comment the **why**, and only when it is not derivable.

```ts
// WTP claims require budget holders because stated willingness to pay
// from non-buyers measures politeness. See Wilson & Lilien (1992).
if (claim.kind === "willingness_to_pay" && economicCount < 2) { ... }
```

Never:
```ts
// increment the counter
count++;
```

Every threshold in `LEVEL_REQUIREMENTS` carries a `source` field in the data itself. A comment would be redundant there — the citation is a value, not prose.

---

## 9. React

- Server Components by default. `"use client"` only for the checkpoint drawer, the matrix popover, and the recompute control — and each one states why in a comment at the top.
- No `useEffect` for derived state. If it can be computed during render, compute it.
- No client-side fetching of findings. They arrive as props from a server component. This is a trust product; the data should not arrive via a fetch a judge can't see.
- Props are explicit. No spreading `...props` onto DOM nodes in domain components.
- Every list has a stable `key` from the domain (`claim.id`), never an index.

---

## 10. Styling

- Tailwind utilities, plus CSS variables for tokens (`02-design-system.md`).
- No arbitrary values (`text-[13.5px]`) unless the token doesn't exist; if it recurs twice, add a token.
- No `className` string concatenation without `cn()` (`clsx` + `tailwind-merge`).
- Component variants via `cva`. Three variants maximum per component; more means it's two components.

---

## 11. Git

**Branches:** `feat/…`, `fix/…`, `docs/…`, `test/…`.

**Commits:** Conventional Commits, imperative, ≤72 chars.

```
feat(engine): report level and support as separate verdict fields
fix(checkpoint): return 422 instead of rendering disabled button
test(engine): add wrong-population golden fixture
docs(security): document name-detection limitation
```

**Rule:** one commit per reviewable idea. A commit that touches `engine/` and `app/` at once usually means the boundary was crossed.

**Before merge:** `npm run check` = `lint && typecheck && test && engine-boundary-check`.

---

## 12. The boundary check

A 20-line script that runs in CI and fails the build if `engine/` imports anything impure:

```ts
const forbidden = [/from ["']react/, /from ["']drizzle/, /from ["']\.\.\/agents/,
                   /\bfetch\(/, /\bprocess\.env/, /\bDate\.now\(/, /\bMath\.random\(/];
```

Why it exists: the product's central claim is that the numbers are deterministic and the model never touches them. That claim should be enforced by a failing build, not by a code review that happens at 02:00 on day 13.

Print the result in the README badge: **`engine purity: enforced`**.

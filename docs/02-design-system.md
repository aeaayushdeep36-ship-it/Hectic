# 02 — Design System

The visual language exists to make one claim believable: *this is an instrument, not an opinion.*

---

## 1. Design thesis

Most AI products in this space look like a dashboard: dark surface, violet gradient, glowing orb, big friendly number. That language says *"trust me, I've done the thinking."* Hectic says the opposite. It should look like a **lab report** or an **audit finding** — paper, ink, monospace numbers, visible sources, nothing decorative.

Three rules follow from that:

1. **Numbers are always monospace.** Every count, level, date, and percentage. Proportional figures in a table of counts invite the eye to skim; monospace invites it to compare.
2. **Borders, not shadows.** Elevation implies a surface floating above the truth. This product sits on the page.
3. **No colour-only encoding.** The empty cell is the hero of the demo, so it must survive greyscale, colour-blindness, and a projector.

---

## 2. Colour tokens

```css
:root {
  /* Surface */
  --paper:        #FBFAF7;   /* page background, warm white */
  --surface:      #FFFFFF;   /* cards, tables */
  --surface-sunk: #F3F1EB;   /* table headers, code blocks */

  /* Ink */
  --ink:          #14171A;   /* primary text */
  --ink-muted:    #5F5E59;   /* secondary text, labels */
  --ink-faint:    #8C8A83;   /* metadata, disabled */

  /* Structure */
  --border:       #E2DFD8;
  --border-strong:#C9C5BB;

  /* Signal — the gap. Used sparingly. */
  --signal:       #9A3412;   /* burnt orange, 7.0:1 on paper */
  --signal-bg:    #FDF1E9;
  --signal-border:#F0C9B4;

  /* Confirmed */
  --confirm:      #14532D;   /* deep green, 8.9:1 on paper */
  --confirm-bg:   #EEF6F0;
  --confirm-border:#BFD9C7;

  /* Neutral finding */
  --neutral:      #475569;
  --neutral-bg:   #F1F3F6;
}
```

**Why warm off-white rather than pure white:** pure `#FFFFFF` on a projector reads as a blank slide. `#FBFAF7` reads as paper and keeps the surface cards distinguishable without shadows.

**Why burnt orange for gaps, not red:** red says *error, you broke something*. Orange says *attention, unfinished*. The product is not punishing the founder; it is pointing at an empty cell.

### 2.1 Heatmap scale

Density, 0 → many. Must be legible in greyscale and under deuteranopia.

| Count | Background | Border | Extra |
|---|---|---|---|
| 0 | `--signal-bg` | 1px dashed `--signal-border` | 45° hatch pattern + centred `—` |
| 1–2 | `#E8EFE9` | 1px solid `#C7D8CB` | — |
| 3–5 | `#C3D9C8` | 1px solid `#A6C4AD` | — |
| 6–10 | `#8FB99A` | 1px solid `#6FA07D` | — |
| 11+ | `#4E8A62` | 1px solid `#3C6E4E` | text switches to `#FFFFFF` |

The zero cell carries a **dash, a hatch, and a dashed border** — three redundant channels, so it survives a black-and-white printout of the deck.

---

## 3. Typography

| Role | Family | Weight | Size / line |
|---|---|---|---|
| Display | Inter | 600 | 40/44, `-0.02em` |
| H1 | Inter | 600 | 28/34 |
| H2 | Inter | 600 | 20/28 |
| Body | Inter | 400 | 15/24 |
| Label | Inter | 500 | 12/16, `0.04em` uppercase |
| **Numeric** | **JetBrains Mono** | 400/500 | inherits size, `font-variant-numeric: tabular-nums` |
| Code / ID | JetBrains Mono | 400 | 13/20 |

```css
--font-ui:   "Inter", ui-sans-serif, system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", monospace;
```

**Self-host both.** No Google Fonts CDN — it's a network dependency in a demo, and a privacy leak in a product that claims local-first. Subset to Latin.

**Rule:** any string that a user might compare against another string vertically is mono. Counts, dates, percentages, claim IDs, org refs. Prose is Inter.

---

## 4. Space, radius, borders

```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-6: 24px; --space-8: 32px;
--space-12: 48px; --space-16: 64px;

--radius-sm: 4px;
--radius-md: 6px;
/* no --radius-lg, no pills */
```

- Cards: `--radius-md`, 1px `--border`, `--surface`.
- No `box-shadow` anywhere except a single focus ring.
- Focus: `outline: 2px solid var(--ink); outline-offset: 2px;` — visible on paper, works in high contrast.

---

## 5. Density

This is a data product, not a marketing site. Two densities:

| Mode | Row height | Used for |
|---|---|---|
| Comfortable | 44px | Claims ledger, forms |
| Compact | 32px | Coverage matrix, evidence table |

The matrix is always compact. Twelve rows of 44px pushes the empty cell below the fold on a laptop, which would break the demo.

---

## 6. Components

### 6.1 `VerdictBadge`

Renders the level **and its support together, in one component**. Showing a level without support is the single most misleading thing this UI could do: L6 from one organisation and L6 from six look identical otherwise. Never colour-only: always shows the label text.

```
┌──────────────────────────┐
│ L2 stated · 5 orgs       │   border: --confirm-border, bg: --confirm-bg
└──────────────────────────┘
```

Claimed vs verified render side by side with an arrow between them:

```
claimed  L4 commitment   →   L2 stated · 5 orgs
```

The arrow is `→` in mono, `--ink-faint`. No red strikethrough on the claimed value — it isn't wrong, it's unearned.

For prevalence claims, the interval renders on a second line in mono: `95% [0.23, 0.88] · n=5 orgs`. The word "best case" follows it, because the sampling was not random.

### 6.2 `CoverageMatrix`

```
                  economic   technical   user   influencer   none
  Dental 5–20         —          2         5        1          —      ← hero row
  Dental 21–50        1          1         2        —          —
  Ortho solo          —          —         3        —          —
```

- Axis headers: `--label` style, `--surface-sunk`.
- Zero cell: hatch + `—`.
- Cell hover/focus: shows contributing aliases in a popover.
- Row labels truncate at 28ch with a title attribute.
- The matrix is a `<table>` with proper `<th scope>` — it *is* tabular data, and screen readers should get the structure for free.

### 6.3 `FindingRow`

```
│ €200/mo price point    L4 → L2 · 5 orgs   DOWNGRADE      ⓘ │
│ Dental practice managers will pay €200/month              │
│ 11 interviews, 5 organisations. Type caps at L2: get one  │  ← binding constraint
│ organisation to commit to a paid pilot.                    │
```

- Left: claim, raw text beneath in `--ink-muted`.
- Right: level transition including support.
- Third line: binding constraint in `--signal`, mono for the counts.
- Network and channel facts appear here as **diagnostics** ("9 of 11 came through one chain") but never change the badge.
- `ⓘ` opens the threshold panel.

### 6.4 `ThresholdPanel`

The honesty surface. Every threshold, its kind, its value, its rationale, its source, and an override control.

```
SATURATION_CODE · saturation         12 orgs
  Theme claims only. 88% of themes and 97% of important
  themes developed by 12 interviews; code saturation 9-17.
  Source: Guest, Bunce & Johnson (2006); Hennink & Kaiser (2017)
  Scope: theme claims only — never shown next to a WTP claim
  [ Override ]    ← logs reason, footnotes the export
```

The `kind` is displayed on purpose. A founder who can see that a saturation count and a precision target are different objects is a founder who understands why twelve interviews is fine for one claim and useless for another.

This panel is the answer to "why should I believe your thresholds?" Put it in the video for three seconds.

### 6.5 `CheckpointDrawer`

Three radio actions, each with a one-line consequence. Below them, a textarea:

```
This claim dies if  [________________________________]
                    at least 40 characters
                    "must name something observable"
```

- Confirm disabled until: action selected, falsifier ≥40 chars, and falsifier is not a restatement of the claim (checked by a trivial heuristic: must contain a condition word — `if`, `when`, `unless`, `should`).
- No placeholder example that a user could copy. Instead, a helper line: *"Name the observation that would make you abandon this."*
- On submit: drawer closes, row animates to resolved state, progress counter increments.

### 6.6 `SourceFootnote`

Every number in the export carries a superscript that maps to a footer. In-app, the same number is a link to `ThresholdPanel`.

---

## 7. Tone rules (copy)

This is the highest-risk surface in the product. A tool that tells a founder their evidence is weak will read as hostile unless the language is strictly factual.

**The rule: describe the sample, never the founder.**

| Never | Instead |
|---|---|
| "You failed to interview decision-makers" | "0 of 11 interviews had budget authority" |
| "Your sample is biased" | "9 of 11 interviews came from one channel" |
| "This isn't real validation" | "This is L2 stated evidence from 5 organisations; the claim asks for L4" |
| "You should have…" | "The binding constraint is…" |
| "Great job!" / "Well done" | *(nothing — praise is not information)* |

Additional rules:

- No exclamation marks anywhere in the product.
- No emoji in UI chrome. (Status glyphs `—`, `→`, `ⓘ` only.)
- The word "failed" appears only for system errors, never for evidence.
- Second person is allowed for instructions ("Add at least 3 interviews"), never for judgements.
- Numbers before adjectives. "7 of 11" beats "most".

---

## 8. Motion

Almost none. This is a document.

| Element | Motion | Duration |
|---|---|---|
| Drawer | slide + fade | 180ms, `ease-out` |
| Row state change | background fade | 120ms |
| Matrix cell hover | border emphasis only | 80ms |
| Page transition | none | — |

`@media (prefers-reduced-motion: reduce)` disables all of it. No spinners — use a static "Analysing…" state with a determinate step counter, because a spinner in a trust product looks like guessing.

---

## 9. Accessibility baseline

- Contrast ≥4.5:1 body, ≥3:1 large and UI borders.
- All interactive elements reachable by keyboard; logical order matches visual order.
- Matrix has `<caption>`, `<th scope="col">`, `<th scope="row">`.
- Zero cells announced as "no interviews" via `aria-label`, not just visual hatch.
- Falsifier textarea has a persistent visible label, not a placeholder.
- Error messages are `role="alert"` and reference the field by name.
- Nothing relies on colour alone (WCAG 1.4.1) — this is why the zero cell has three redundant signals.

---

## 10. What this system refuses

- Gradients on any functional surface
- Glassmorphism, blur, glow
- A mascot, an avatar, or a personality
- Confetti, streaks, or celebration states
- A big number that means "score"
- Dark mode in v1 (the export is paper; the app should match the artefact)

The last one is a real decision. Dark mode would double the token surface for zero rubric value, and it would make the app look like every other AI tool. The product looks like the document it produces.

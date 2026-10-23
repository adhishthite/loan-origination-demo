# Credit Desk — Design System (Religare Finvest theme)

## Brief
- **Subject**: Retail and SME loan underwriting in India, run by Google ADK agents with a human underwriter in the loop.
- **Audience**: Bank CXOs/CTOs watching a Google Cloud demo, and the underwriters who would use it.
- **Primary job**: Watch one application move from intake to a defensible decision, and see *why* it landed there.

## Brand source
Theme, palette and fonts follow [religarefinvest.com](https://www.religarefinvest.com/), sampled from the live site's computed styles on 23 Oct 2026. Where Religare's site and the design rules below disagree, **Religare wins**.

| Religare element | Value | Used for in Credit Desk |
| :--- | :--- | :--- |
| Brand green | `#1F7140` | Primary buttons, active tab, selection, agent actions, approved |
| Lime highlight | `#E6EFC1` | Approved / auto-approve tint |
| Marigold CTA | `#FFB342` on `#37393F` | Review accents (`btn-accent` available) |
| Charcoal | `#37393F` | Top utility strip, modal backdrop |
| Body text | `#333333` | `--ink` |
| Light greys | `#F5F5F5`, `#F8F8F8`, `#DDDDDD` | Page, sunken surfaces, rules |
| Error tint | `#FFDEDE` | Decline tint |
| Headings, buttons | Poppins 600–700 | `h1–h3`, `.section-title`, `.btn`, `.display` |
| Body, nav, data | Inter 400–600 | Everything else, incl. tabular numerals |
| Corners | Square buttons and cards | `--radius-md/lg = 0`, pills 2px |
| Logo | `public/religare-logo.svg`, `public/religare-logo-white.png` | Header (light / dark) |

## Concept: the credit file
A loan decision is a document with a trail. The UI reads like a working credit dossier, not a SaaS dashboard: one surface per file section, hairline rules between sub-sections, numbers set like a ledger.

**The one bold element: the Policy Ruler.** A horizontal FOIR scale (0–80%) with three shaded policy zones (≤45% approve, 45–55% review, >55% decline). Markers show the requested loan and the counter-offer, joined by an arrow. It appears in the workbench decision header and drives the counter-offer simulator. Everything else stays quiet.

**Second ADK showcase: the Agent Trace.** A Cloud Trace–style waterfall: one row per agent/tool, bars proportional to duration, parallel agents overlapping in time. Replaces the three-card topology.

## Tokens (defined in `src/styles/globals.css`)
| Role | Light | Dark |
| :--- | :--- | :--- |
| `--brand` | `#1F7140` | `#3FA66A` |
| `--paper` | `#F5F5F5` | `#1A1B1F` |
| `--sheet` | `#FFFFFF` | `#222429` |
| `--ink` | `#333333` | `#ECECEC` |
| `--graphite` | `#5F6166` | `#B4B6BB` |
| `--rule` | `#DDDDDD` | `#37393F` |
| `--agent` | = brand | = brand |
| `--approve` / tint | `#1F7140` / `#E6EFC1` | `#6CC48F` / `#22331D` |
| `--review` / tint | `#8A5A00` / `#FFF1DA` | `#FFB342` / `#3A2B12` |
| `--decline` / tint | `#B3261E` / `#FFDEDE` | `#FF8A80` / `#3D1D1B` |

Each semantic color has a `-tint` (background) variant. Dark mode remaps all tokens; never use `#000`.

Use the Tailwind utilities mapped in `@theme`: `bg-paper`, `bg-sheet`, `text-ink`, `text-graphite`, `border-rule`, `text-agent`, `bg-agent-tint`, `text-approve`, `bg-approve-tint`, etc. **Do not use raw Tailwind palette colors** (`blue-600`, `emerald-500`, `rose-*`, `amber-*`).

## Type
- **Poppins** — headings, section titles, buttons (Religare standard).
- **Inter** — body copy, navigation, tables, the credit memo (Religare standard; no serif).
- **JetBrains Mono** — only real code/JSON (A2A payloads, agent card). Never for labels or numbers.
- Money, percentages, scores: `tabular-nums` (`.num` class), never monospace.
- Scale: 12 / 13 / 14 / 16 / 20 / 28. Body 13–14px. Section titles 14px semibold. Page title 20px.

## Shape and structure
- Square corners, as on Religare's site. Pills get a 2px radius; timeline markers and dots stay circular.
- One surface per section. Separate sub-parts with `border-t border-rule`, not nested cards.
- No drop shadows except the sticky decision bar and modals.
- Numbered markers only where content is a real sequence (the 5 pipeline stages).

## Copy rules
- Sentence case everywhere. No ALL-CAPS labels, no tracked-out eyebrows.
- No internal IDs in UI copy (`FR-01`, `TRD-*`, `POL-03` is OK only inside the policy table as a reference column).
- No `→` on buttons, no `A · B · C` meta strings.
- Statuses: "Draft", "Running", "Approved", "Needs review", "Declined", "Disbursed".
- Buttons say what happens: "Run underwriting", "Approve as requested", "Send counter-offer", "Decline application", "Sign and accept".
- One label per element. Helper text only when it prevents an error.

## Motion
- One orchestrated moment: Agent Trace bars grow left-to-right when a run completes.
- Response motion for opening drawers/modals. No hover lift on cards, no ping dots.
- Respect `prefers-reduced-motion`.

## Quality floor
Responsive to 375px, visible `focus-visible` rings (`--agent`), AA contrast, keyboard reachable controls.

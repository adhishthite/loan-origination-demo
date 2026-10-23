# Credit Desk — Design System

## Brief
- **Subject**: Retail and SME loan underwriting in India, run by Google ADK agents with a human underwriter in the loop.
- **Audience**: Bank CXOs/CTOs watching a Google Cloud demo, and the underwriters who would use it.
- **Primary job**: Watch one application move from intake to a defensible decision, and see *why* it landed there.

## Concept: the credit file
A loan decision is a document with a trail. The UI reads like a working credit dossier, not a SaaS dashboard: one surface per file section, hairline rules between sub-sections, numbers set like a ledger.

**The one bold element: the Policy Ruler.** A horizontal FOIR scale (0–80%) with three shaded policy zones (≤45% approve, 45–55% review, >55% decline). Markers show the requested loan and the counter-offer, joined by an arrow. It appears in the workbench decision header and drives the counter-offer simulator. Everything else stays quiet.

**Second ADK showcase: the Agent Trace.** A Cloud Trace–style waterfall: one row per agent/tool, bars proportional to duration, parallel agents overlapping in time. Replaces the three-card topology.

## Tokens (defined in `src/styles/globals.css`)
| Role | Light | Use |
| :--- | :--- | :--- |
| Paper `--paper` | `#F3F5F8` | Page background |
| Sheet `--sheet` | `#FFFFFF` | Section surfaces |
| Ink `--ink` | `#0F1B2D` | Primary text, primary buttons |
| Graphite `--graphite` | `#5B6676` | Secondary text |
| Rule `--rule` | `#DCE1E7` | Hairlines, borders |
| Agent `--agent` | `#1F5FD6` | Anything an agent did (traces, A2A, "run" actions) |
| Approve `--approve` | `#1E7F4F` | Approved, passed checks |
| Review `--review` | `#B7791F` | Needs review, counter-offer |
| Decline `--decline` | `#B42318` | Declined, knockouts |

Each semantic color has a `-tint` (background) variant. Dark mode remaps all tokens; never use `#000`.

Use the Tailwind utilities mapped in `@theme`: `bg-paper`, `bg-sheet`, `text-ink`, `text-graphite`, `border-rule`, `text-agent`, `bg-agent-tint`, `text-approve`, `bg-approve-tint`, etc. **Do not use raw Tailwind palette colors** (`blue-600`, `emerald-500`, `rose-*`, `amber-*`).

## Type
- **Public Sans** — all UI. Institutional, legible, not the default Inter.
- **Source Serif 4** — only the Credit Assessment Memo body. The memo is a document; it reads like one.
- **JetBrains Mono** — only real code/JSON (A2A payloads, agent card). Never for labels or numbers.
- Money, percentages, scores: `tabular-nums` (`.num` class), never monospace.
- Scale: 12 / 13 / 14 / 16 / 20 / 28. Body 13–14px. Section titles 14px semibold. Page title 20px.

## Shape and structure
- Radius hierarchy: sections `rounded-lg` (8px), controls `rounded-md` (6px), status pills `rounded-full`. Nothing else.
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

# CubeStudio V2 — Design Brief for UI/UX Redesign

> **Purpose of this document:** This is a design specification, not a code spec. It exists to brief **Google Stitch** on what CubeStudio V2 currently is, what its screens and functionality are, what is wrong with its current visual design, and what direction a redesign should take. It was produced by directly inspecting the CubeStudio V2 repository (React 19 + Three.js frontend, Flask backend). **No application code was changed to produce this document.**

---

## 1. What CubeStudio V2 Is

CubeStudio V2 is a **speedcubing application**, not a beginner toy. It is a single-page React app (`App.jsx`) with a floating pill-style top navigation switching between five tabs, backed by a pure, framework-agnostic cube engine (`CubeState`, `applyMove`, `notation`, `validation`) that every feature shares. A Flask backend exposes a Kociemba two-phase solver (`/api/v1/solve`, `/api/v1/validate`, `/api/v1/health`).

Core product pillars, all already implemented and working:

- A real-time 3D Rubik's Cube rendered in Three.js, driven entirely by the shared `CubeState` model
- A 2D "net" manual cube editor for hand-painting a cube state sticker-by-sticker
- A Kociemba-algorithm solver with a live, interactive solution player
- A WCA-style speedcubing timer with inspection, +2/DNF penalties, and live Ao5/Ao12 stats
- A solve history and statistics browser with export (CSV/JSON) and a detail modal
- A 9-lesson guided beginner training curriculum that runs inside the real 3D simulator

The redesign is a **visual and UX facelift only**. It must not change what any of these systems do.

---

## 2. Actual Application Structure (As Found in the Repository)

### 2.1 Navigation & shell
- No router library is used. `App.jsx` holds a single `activeTab` state (`simulator | editor | solver | timer | training`) and conditionally renders one feature view at a time.
- Navigation is a **floating pill bar** centered at the top of the viewport (`app-nav`), with rounded tab buttons, not a sidebar and not a conventional top bar with a logo/left alignment.
- There is no logo/brand mark beyond a text label ("CubeStudio V2") that appears inside the simulator's own floating header, not in the global nav.
- There is no breadcrumb system, no settings page, no user account/profile UI, no about page. **Do not invent these** — Stitch should not assume they exist.
- Cross-navigation happens by passing cube state between features via callback props (e.g., "Open in Solver" from the Simulator, "3D View" from a saved Timer solve). This inter-screen handoff is a real, working piece of UX and should be preserved and made clearer, not removed.

### 2.2 Screens that exist today

**1. 3D Simulator** (`features/simulator`)
- Purpose: primary interactive cube — the main "workshop" screen.
- Existing UI: full-bleed Three.js viewport with **floating glassmorphic panels layered on top**: a header (brand + solved/scrambled badge + move counter + last move), a bottom-center toolbar (prime/double modifiers, U/D/L/R/F/B face buttons, Scramble, Undo, Redo, Reset, View-reset, Editor, Solve), a bottom-left keyboard-hint chip, and a bottom-right animation-speed `<select>`.
- Interactions: click-to-turn face buttons, full keyboard control (U/D/L/R/F/B + Shift for prime + Alt for double, Space to scramble, Escape to reset, Cmd/Ctrl+Z undo, Cmd/Ctrl+Y redo), drag-to-orbit camera.
- States: solved vs. scrambled badge, disabled Undo/Redo when unavailable, a `has-solution-player` layout mode that hides face buttons and compresses the toolbar when a solution is playing back.
- A **Solution Player** can dock underneath the viewport (compact mode) when arriving from the Solver or Timer with a scramble/solution to play back.
- A `variant="training"` mode reuses this exact same component inside the Training screen, hiding Scramble/Reset and the Editor/Solve shortcuts (Training owns those actions itself).

**2. Manual Editor** (`features/editor`) — *exists, not explicitly named in most prior briefs; must be included*
- Purpose: hand-edit a cube state directly, sticker by sticker, on a 2D unfolded net.
- Existing UI: a 6-panel cross-shaped net layout (U/L/F/R/B/D), a color palette with live per-color sticker counts (e.g., "9/9" turns valid, anything else is flagged), a live validation banner (valid/invalid with a specific error code and message), an undo/redo/reset/clear toolbar, and an import/export panel for the raw 54-character Kociemba facelet string.
- Interactions: click a palette color, then click stickers to paint; center stickers are fixed and unclickable; paste a facelet string to import; copy the current string to clipboard.
- States: valid vs. invalid configuration (blocks "Load into Simulator" and "Solve Cube" when invalid), per-color count correctness, import success/error messaging.

**3. Solver** (`features/solver`)
- Purpose: take the shared cube state, validate it, call the backend Kociemba solver, and play back the result.
- Existing UI: header with a live backend-health badge (checking/online/offline, with a retry action), the current cube's Kociemba string shown in a monospace code block, a local-validation banner, a prominent "Solve Cube" button, an error banner for backend failures, a result summary (move count or "already solved"), an embedded **Solution Player**, and the raw notation string.
- States: loading/solving, backend online/offline/unknown, local-valid/local-invalid, solved successfully, solve error.
- This screen currently uses **raw emoji as its iconography** (⏳ 🟢 🔴 ✅ ❌ ⚠️ 🔍 🔄 ▶) instead of the `lucide-react` icon set used everywhere else in the app — a concrete inconsistency described further in Section 4.

**4. Solution Player** (`features/solver/SolutionPlayerView`) — *shared component, not a standalone tab*
- Purpose: play back a sequence of solving (or scrambling) moves with full transport controls, embedded either inline in the Solver screen or docked beneath the 3D Simulator.
- Existing UI: a step counter with percent complete, a status tag (Playing/Paused/Solved/Ready), a horizontal scrollable "move rail" of chips (completed / current / upcoming, each clickable to jump), a progress bar, a "next move" hint card with a natural-language description, and a control bar (Restart, Prev, Play/Pause, Next, plus 0.5x/1x/1.5x/2x speed pills).
- Interactions: click any move chip to jump to it, Arrow Left/Right to step, Space to play/pause, `R` to restart, Escape to close (when closable).
- This is already a well-built, accessible component (ARIA roles/labels on the progress bar and move track, keyboard shortcuts, ignores keys while typing in inputs) — a good reference for the quality bar the rest of the redesign should meet.

**5. Timer** (`features/timer`)
- Purpose: a fast, WCA-style speedcubing stopwatch.
- Existing UI: a scramble card with copy/regenerate actions, a 15-second-inspection toggle, an internal Timer/History sub-tab switcher, a very large monospace digital readout (5.5rem, JetBrains Mono) with color-coded states, a status badge (Inspection/Ready/Idle/Solve Complete), a contextual interaction hint line, post-solve actions (+2, DNF, Next Scramble, "3D View", "Solve"), and a 5-cell quick-stats strip (Best, Ao5, Ao12, Session Mean, Solve count).
- Interactions: press-and-hold Space to inspect/ready, release to start, any key or tap to stop, auto-save on stop, click-and-hold on the digits area (mouse or touch) as an alternative to keyboard.
- States: Idle, Inspection (with a warning sub-state near the 15s mark), Ready, Running, Stopped, Saved; DNF and +2 penalty states restyle the digits.

**6. History** (`features/timer/HistoryView`) — *sub-view of Timer, not a separate top-level tab*
- Purpose: browse, inspect, export, and manage recorded solves.
- Existing UI: a header with solve count and Export-JSON/Export-CSV/Clear-All actions, a 4-card statistics overview (Best Single, Current Ao5, Current Ao12, Session Mean — each rendered with equal visual weight today), a sortable/scrollable table (#, Time, Penalty, Scramble, Moves, Date, Actions), row actions (View, open in 3D Simulator, open in Solver, Delete), and a **detail modal** on row click (large time display, raw time in ms, penalty, scramble with copy button, solution algorithm, recorded date, and shortcuts to Simulator/Solver/Delete).
- States: empty state ("No solves recorded yet…"), DNF/+2 row styling, delete confirmation via native `window.confirm`.

**7. Training** (`features/training`)
- Purpose: a guided 9-lesson beginner curriculum (Cube Basics, Cube Notation, White Cross, White Corners, Second Layer, Yellow Cross, Yellow Face, Last-Layer Corners, Last-Layer Edges), teaching against the same `CubeState` engine and the same 3D simulator used everywhere else — "never a second cube."
- Existing UI has two distinct layouts:
  - **Curriculum list (landing) screen**: a hero header (kicker label, title, description, "X / 9 lessons complete" progress line) above an ordered list of lesson cards, each showing a status glyph (`✓` complete / `🔒` locked / `→` next — again mixing emoji with the app's icon set), order number, title, and one-line objective. Locked lessons are disabled.
  - **Active lesson layout**: a two-pane split — the real 3D Simulator (in a restricted `variant="training"` mode) on the left, and an instructional panel on the right containing a "back to curriculum" link, lesson order/title, current phase label, an Objective section, conditionally an Explanation section (intro/explanation phases) or an Instruction + algorithm section (practice phase), inline feedback messaging, a Hint section with an escalating-hint button, and an action row (Previous, Reset step, Reset lesson, Next/"Next lesson").
- States/phases: `NOT_STARTED → INTRO → EXPLANATION → DEMO → PRACTICE → COMPLETED`, lesson locked/unlocked/completed, hint level 0–3.

### 2.3 Cross-cutting UI elements already in place
- **Buttons**: a shared `.btn` pattern (dark translucent surface, subtle lift on hover) reused with variants across Simulator/Editor/Timer/History; the Solver and its "Solve Cube" button instead use a **blue-to-purple gradient pill**, which is visually distinct from every other button in the app.
- **Cards/panels**: consistently frosted-glass (`rgba` dark background + `backdrop-filter: blur(12px)` + a 1px translucent border) across the Simulator's floating chrome, the app nav, and several stat pills — this glass pattern is the closest thing the app has to an established visual identity today.
- **Modals**: exactly one modal exists (the History solve-detail modal): a centered card over a dark overlay, closed by an explicit X button or by clicking the overlay.
- **Validation/status banners**: repeated in the Editor (valid/invalid) and Solver (valid/invalid/error) with similar but not identical color and copy conventions.
- **Icons**: `lucide-react` is used almost everywhere (Simulator, Editor, Timer, History, Training, Solution Player), but the **Solver screen and Training's status glyphs fall back to raw emoji**, breaking the icon language.
- **Loading/empty states**: a backend "Checking backend…" state in Solver; an explicit empty state in History ("No solves recorded yet…"); no dedicated skeleton/loading treatment for the 3D scene itself.
- **Responsiveness**: only the Timer has an explicit mobile breakpoint (`timer-digits` shrinks from 5.5rem to 3.75rem, hint copy shrinks). The Simulator's floating-panel-over-canvas approach, the Editor's 6-panel net, and the History table have no documented responsive behavior in the CSS as found.
- **Accessibility**: the Solution Player is the accessibility high-water mark of the app (ARIA roles, labels, keyboard support). Elsewhere, ARIA usage is sparse, and — notably — **no `:focus` or `:focus-visible` styling exists anywhere in the current stylesheets**. This is a real gap the redesign should close, not merely preserve.

---

## 3. Design System Inconsistencies Found (Evidence-Based)

These are concrete, verified inconsistencies in the current codebase that the redesign should resolve. They are listed so Stitch understands what "unifying the design language" concretely means here — not as a rejection of the current look, but as the specific seams to close.

- **"Success/green" is inconsistent**: at least five different green values are in active use for success/valid/online states across files: `#4ade80`, `#6ef76e`, `#7ef87e`, `#10b981`, and `rgba(34, 197, 94, …)`. A single semantic `success` color should replace all of these.
- **Monospace font stacks differ by screen**: the Timer and Solution Player use `'JetBrains Mono', 'SF Mono', …`; the Solver uses `'JetBrains Mono', 'Fira Mono', …`; the Editor and some Simulator labels fall back to the bare generic `monospace`. One numeric/code font stack should be defined once and reused everywhere (timer digits, move notation, Kociemba strings, algorithm text).
- **Body font differs on one screen**: the Solver declares `font-family: 'Inter', system-ui, sans-serif`, while the rest of the app uses the system-UI stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, …`) set globally in `app.css`. Pick one direction (either adopt a real webfont everywhere, or standardize on the system stack everywhere) rather than mixing.
- **Primary button styling diverges**: most primary actions use a flat dark translucent `.btn`; the Solver's main call-to-action is a gradient pill (`linear-gradient(135deg, #6a9fff, #9b6aff)`). Decide on one primary-button treatment.
- **Iconography mixes systems**: `lucide-react` vector icons everywhere except the Solver screen and Training's lesson-status glyphs, which use raw emoji (⏳ 🟢 🔴 ✅ ❌ ⚠️ 🔍 🔄 ▶, 🔒, ✓). Emoji should be replaced with the existing icon set for visual and cross-platform consistency.
- **Border radius is directionally consistent but not standardized**: values cluster around 6px/8px/10px/12px plus pill shapes (999px), suggesting an implicit small/medium/large/pill scale already exists — this should be made explicit rather than redefined from scratch.
- **No focus states**: zero `:focus` / `:focus-visible` rules exist in any stylesheet in the repository. This is an accessibility gap, not a stylistic choice, and should be fixed by the redesign.
- **Statistics have flat hierarchy**: the History screen's four stat cards (Best Single, Current Ao5, Current Ao12, Session Mean) are rendered with equal visual weight; nothing distinguishes a personal best from a session mean.

---

## 4. What Already Works Well (Preserve the Intent)

- The **frosted-glass floating panel** treatment over the 3D viewport is a reasonable, already-partially-executed identity for CubeStudio — refine it, don't discard it outright.
- The **Western cube color scheme** used by the 3D renderer is fixed and correct WCA convention (U white `#FFFFFF`, R red `#DC2626`, F green `#16A34A`, D yellow `#FACC15`, L orange `#EA580C`, B blue `#2563EB`) — this is a rendering constant, not a design choice, and must not be altered by the redesign.
- The **Solution Player** is the best-built UI in the app today (state clarity, keyboard support, ARIA) and should be treated as a reference bar for interaction quality across the rest of the redesign.
- The **Timer's large monospace digit display** is already a strong, purpose-built pattern for a speedcubing app and should be preserved and refined, not replaced with something more decorative.
- The **shared cube engine feeding every screen** (Simulator, Editor, Solver, Timer scrambles, Training) is the product's core strength — the redesign is explicitly about surfacing this consistency visually across screens that currently look like five different apps.

---

## 5. Proposed Visual Direction

CubeStudio should read as **professional speedcubing software**: the kind of tool a serious cuber or a portfolio reviewer would take seriously, closer to a well-built dev tool or a precision instrument panel than a marketing site or a learning app for children.

**It should avoid:** generic SaaS-dashboard chrome, big glassmorphism-for-its-own-sake, marketing-style hero sections, decorative illustrations, gamified badges/confetti/mascots, and excessive gradients/shadows. The cube itself — rendered, not decorative — should remain the visual anchor on every screen where it's relevant.

**It should favor:** a dark, technical, high-contrast base; a single well-defined accent color used sparingly and consistently for primary actions and active/selected states; strong, purposeful typographic hierarchy (especially for the timer digits and move/algorithm notation, which are read at a glance mid-solve); and restrained, functional motion (state transitions, not decoration).

### 5.1 Color system (roles to define; exact values are Stitch's to choose, informed by the audit above)
- `background-primary` — page-level background (today: near-black navy, `#0b0f19`; a reasonable anchor to keep or refine)
- `background-secondary` — larger content regions, screen containers (Editor, Solver, History, Training panels)
- `surface` — cards, panels, table rows, stat pills
- `surface-elevated` — modals, dropdowns, the floating simulator chrome, popovers
- `border` — a single subtle border/divider value, replacing today's many slightly different `rgba(255,255,255,0.0x)` borders
- `text-primary`, `text-secondary`, `text-muted` — replacing today's inconsistent grays (`#f1f5f9`, `#e2e8f0`, `#94a3b8`, `#888`, `#aaaaaa`, etc.)
- `accent` — one primary interactive color (today's closest candidates are the nav's `#2563eb` and the simulator's `#38bdf8` highlight — pick one and use it everywhere: active tab, primary button, selected state, focus ring)
- `success` — one green, replacing the five currently in use (solved, valid, backend-online, playing)
- `warning` — one amber/yellow, for inspection countdown warnings and +2 penalties (today's `#facc15`/`#eab308`/`#ffc070` family)
- `error` — one red, for DNF, invalid states, backend-offline, validation errors (today's `#ef4444`/`#f87171`/`#ff6b6b`/`#ff7f7f` family)
- `info` — for neutral status like "Ready", "Unknown backend health"

The six cube-face render colors (Section 4) are a separate, fixed palette used only inside the 3D scene and 2D net editor — they are not part of the UI chrome color system and must not be reinterpreted as UI accent colors.

### 5.2 Typography
- One **UI sans-serif** direction for all interface chrome, headings, and body copy — either commit fully to a webfont (the Solver's unused `'Inter'` intent is a reasonable direction) or commit fully to the system-UI stack already used elsewhere. Do not mix.
- One **monospace** direction for everything numeric/technical: timer digits, move notation chips, Kociemba facelet strings, algorithm text, and raw notation output. This is the single highest-impact typography decision in the app, since the timer digits and algorithm notation are read quickly, often mid-solve.
- A clear heading scale (screen titles like "Cube Solver" / "Solve History" / "Manual Cube Editor" vs. section labels like "Objective" / "Hint" vs. small uppercase labels like "Kociemba String" / "Best Single").
- The timer display deserves its own oversized, tabular-figure treatment distinct from every other number in the app (it already gets special sizing at 5.5rem — keep that intent, refine the execution).

### 5.3 Spacing, radius, elevation, icons
- Define one spacing scale (e.g., 4/8/12/16/24/32) and apply it consistently instead of the current screen-by-screen padding choices.
- Formalize the radius scale that's already implicit in the code: a small radius for buttons/inputs, a medium radius for cards/panels, and a pill radius for badges/tags/status chips — nothing larger, and no "everything is a giant rounded card" styling.
- Elevation should be purposeful and shallow: the floating simulator chrome and modals can sit visibly above the base layer; ordinary cards and table rows should not compete with them for attention.
- Standardize on `lucide-react` as the **only** icon system across the entire app, explicitly replacing the emoji currently used in the Solver screen and Training's lesson-status glyphs.

---

## 6. Global Application Shell

- Keep the existing "no full page reload, single active screen" navigation model — it works and matches how a fast-moving speedcubing tool should feel. Stitch can refine the *chrome* of the nav (its shape, placement, and active-state styling) without introducing routing, sidebars-with-sub-items, or breadcrumb trails that don't correspond to anything the app currently has.
- A sidebar is not mandated — the current top-centered pill nav is a legitimate pattern for 5 top-level destinations; if Stitch proposes a sidebar instead, it should still map 1:1 to the existing five tabs (Simulator, Editor, Solver, Timer, Training) and should account for the Editor and History as accessible from that structure (History today lives as a sub-tab *inside* Timer, not as a sixth top-level item — preserve that relationship unless there's a clear, stated reason to promote it).
- Global elements to design once and reuse: the app's primary button, secondary button, destructive/danger button (History already has one: "Clear"), status/validation banner, badge/tag, stat card, and modal shell.
- No user accounts, settings screen, or search currently exist — do not add chrome implying they do.

## 7. 3D Simulator UX Guidance
- Keep the cube as the dominant visual element; UI chrome should continue to float over/around it rather than displacing it into a smaller viewport.
- Preserve exactly: face-turn buttons (U/D/L/R/F/B) with prime/double modifiers, Scramble, Undo/Redo, Reset, camera-reset ("View"), the move counter, last-move readout, solved/scrambled badge, the animation-speed selector, and the keyboard-shortcut hint.
- Preserve the `has-solution-player` compact mode where face buttons hide and remaining controls compress when a solution is docked beneath the viewport — this is deliberate, tested behavior, not an oversight.
- Preserve the `variant="training"` mode where Scramble/Reset/Editor/Solve are hidden because Training owns those actions through its own panel.

## 8. Solver UX Guidance
- Preserve: the Kociemba-string display, local validation banner, backend health indicator with retry, the Solve action, error banner, result summary (including the "already solved" zero-move case), the embedded Solution Player, and the raw notation output.
- Bring this screen's visual language (typography, button style, icons, banner colors) into line with the rest of the app — this is the single screen most out of step with everything else today.
- A clear before/after should be: replace all emoji status glyphs with `lucide-react` icons that already exist in this codebase's palette (e.g., the `CheckCircle2`/`AlertTriangle`/`X` family used in the Editor and Solution Player).

## 9. Solution Player UX Guidance
- Preserve exactly: the move rail with completed/current/upcoming chip states and click-to-jump, the progress bar and percent counter, the natural-language hint card, Restart/Prev/Play-Pause/Next controls, the 0.5x–2x speed pills, and the keyboard shortcuts (Arrow keys, Space, `R`, Escape).
- This component appears in two contexts (embedded full-width in the Solver, docked compact beneath the Simulator) — the redesign should make both contexts feel like the same component at two sizes, not two different widgets.

## 10. Speedcubing Timer UX Guidance
- Preserve exactly: press-and-hold Space or tap-and-hold to inspect/ready/start, any-key-or-tap to stop with auto-save, the 15-second WCA inspection toggle with a late-inspection warning state, +2 and DNF penalty toggles, "Next Scramble," and the shortcuts into 3D View and Solve.
- Preserve the oversized digit readout as the clear focal point of this screen, with status communicated primarily through color/state on the digits themselves plus a short badge — not through added chrome that would slow down reading the time.
- The quick-stats strip (Best, Ao5, Ao12, Session Mean, Solve count) should stay lightweight and glanceable here; richer statistics belong in History.

## 11. History & Statistics UX Guidance
- Preserve: JSON/CSV export, Clear All (with confirmation), the sortable/scannable solves table (time, penalty, scramble, move count, date, actions), per-row actions (view detail, open in Simulator, open in Solver, delete), and the detail modal's full content (raw ms time, penalty, scramble with copy, solution algorithm, recorded date, and its own shortcuts).
- Improve the information hierarchy: give the single best time (personal best) and the current rolling averages (Ao5/Ao12) more visual weight than the session mean and raw solve count, rather than four equally weighted cards as today.
- The empty state ("No solves recorded yet…") should stay simple and should point back to the Timer.

## 12. Training UX Guidance
- Preserve the two-layout structure: a curriculum list (hero + lesson list with locked/current/completed states and per-lesson objective) and an active-lesson two-pane layout (real 3D simulator + instructional panel).
- Preserve the panel's phase-based content (Objective always shown; Explanation during intro/explanation; Instruction + algorithm during practice; feedback messaging; an escalating multi-level hint system) and its action row (Previous, Reset step, Reset lesson, Next / "Next lesson").
- Replace the emoji lesson-status glyphs (`✓ 🔒 →`) with the app's `lucide-react` icon set (the screen already imports `Lock` and `Check` for other uses — reuse them here too instead of the literal glyph strings).
- Keep this screen visually continuous with the Simulator it's built on — a learner should never feel like Training is a "lite" or "childish" version of the same cube.

## 13. Manual Editor UX Guidance
- Preserve: the 6-face 2D net layout, the color palette with live per-face sticker counts and correctness indicators (9/9 = valid), the live validation banner with specific error codes/messages, Undo/Redo/Reset-to-Solved/Clear-Net, and the raw facelet-string import/export panel with copy/paste.
- This is a technical, precision tool (closer to a data-entry grid than a creative canvas) — style it accordingly, consistent with the Solver's technical tone, rather than as a playful "coloring" interface.

## 14. Responsive Design Guidance
- **Desktop/laptop** is the primary target — this is a tool used at a desk, often alongside a real cube.
- **Tablet**: the Simulator's floating-chrome-over-canvas pattern and the Editor's 6-panel net both need explicit tablet behavior defined (today, only the Timer has a documented breakpoint). Avoid simply stacking every floating panel vertically; consider which controls can collapse, combine, or move to an edge without leaving the cube viewport cramped.
- **Small screens**: the Timer's existing breakpoint (digit size step-down, hint-copy size step-down) is the right pattern to extend to other screens rather than inventing a new responsive approach per screen. The 3D cube and the timer digits are the two elements that most need guaranteed minimum legible size at every breakpoint.

## 15. Interaction Design Guidance
- Define one consistent set of hover/active/pressed/disabled treatments for buttons and reuse it everywhere (today's `.btn:hover`/`:active`/`:disabled` pattern in the Simulator is a reasonable base).
- Define visible, consistent `:focus-visible` styling for every interactive element — this does not exist anywhere today and is a real gap, not a design preference.
- Keep transitions subtle and fast (today's ~0.15s ease pattern is appropriate) — this is a tool with a live WebGL scene, so animation budget should go toward the cube itself, not decorative UI motion.
- Loading states (backend health check, solving) and empty states (no solves yet) should follow one shared visual pattern rather than each screen inventing its own.

## 16. Accessibility Guidance
- Maintain full keyboard operability of the Simulator, Solution Player, and Timer exactly as implemented (documented in Sections 7–10).
- Add visible focus states app-wide (see Section 15) — this is the most significant accessibility gap found in the current implementation.
- Preserve and extend the ARIA patterns already present in the Solution Player (roles, labels, `aria-current`, `aria-pressed`) to the Editor's sticker grid, the History table's row actions, and the Training curriculum list, which currently lack them.
- Maintain readable contrast for all status colors (success/warning/error) against the dark background — verify contrast when consolidating the five current "green" values into one.

---

## FUNCTIONALITY PRESERVATION

**This is a UI/UX redesign only.** Stitch is being asked to improve presentation, layout, visual hierarchy, consistency, responsiveness, and interaction design — not to change what the application does or how it behaves internally.

The redesign must **not** remove, replace, reduce, or fundamentally alter any of the following, all of which exist today and are working:

- `CubeState`, the cube domain model, and its serialization (Kociemba string format)
- The move engine: `applyMove`, `parseAlgorithm`/notation parsing, `validation`, `scramble` generation
- The 3D rendering pipeline: `CubeScene`, `CubeRenderer`, `CubieMeshFactory`, `AnimationQueue`, `MoveAnimator`, and the fixed Western color scheme
- `SimulatorController` (undo/redo/history stack, animation speed, keyboard shortcut behavior)
- `EditorController` (sticker painting, per-color counts, import/export, validation)
- `SolverController` and the backend Kociemba solve/validate/health API contract (`/api/v1/solve`, `/api/v1/validate`, `/api/v1/health`)
- `SolutionPlayerController` (playback state machine, speed control, hint generation, move-by-move stepping)
- `TimerController` and its state machine (Idle/Inspection/Ready/Running/Stopped/Saved), inspection countdown/warning logic, and +2/DNF penalty logic
- `statistics.js` (Ao5/Ao12/session-mean/best-single/improvement calculations)
- `solveStorage.js` (solve persistence, CSV/JSON export, delete/clear)
- `TrainingController`, the 9-lesson curriculum content and ordering, lesson-phase state machine, hint-escalation logic, and lesson lock/unlock/completion logic
- Every existing keyboard shortcut and pointer/touch interaction documented in Sections 7–13
- Every existing cross-screen handoff (Simulator ↔ Editor ↔ Solver ↔ Timer ↔ History), including what data is passed between them

Stitch should treat every color, spacing value, font stack, icon choice, and layout arrangement as changeable; it should treat every controller, data model, API endpoint, keyboard shortcut, and stated interaction behavior above as fixed.

---

## 17. Explicit Anti-Goals

To keep the result feeling like real software for speedcubers rather than a generic redesign template, avoid:

- Excessive gradients or glassmorphism beyond a restrained, purposeful use of translucency (the app already uses a light frosted-glass treatment for floating panels — do not escalate this into a dominant visual gimmick)
- "Everything is a giant rounded card" styling
- Large decorative illustrations, mascots, or hero-style marketing sections
- Unnecessary animation — this app runs a live WebGL scene and a millisecond-precision timer; motion budget is limited
- Excessive or inconsistent shadow use
- A sprawling, arbitrary color palette — consolidate, don't multiply
- Childish gamification (badges, confetti, playful mascots) in Training — the curriculum is for serious learners, styled consistently with the rest of the app
- Generic "AI product" or SaaS-dashboard aesthetics (large empty-state hero cards, oversized marketing typography, unnecessary onboarding carousels)

---

## 18. Summary for Stitch

CubeStudio V2 already has five real, working screens sharing one cube engine, one Three.js renderer, and a mostly-consistent dark, frosted-glass visual language — the job is to **finish and formalize** that language (one color system, one type system, one icon system, one spacing/radius scale, real focus states) and apply it evenly across every screen, rather than to invent a new product concept. The cube — rendered in its real Western competition colors — stays the visual center of gravity throughout.

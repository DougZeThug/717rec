# Dead-Code Cleanup — 2026-07-06

> Historical record — workflow names below refer to the pre-consolidation CI; `knip.yml` is now the "Check dead code" step of the `quality` job in `ci.yml`.

Follow-up to `CODE-QUALITY-AUDIT-2026-04-24.md`, which graded architecture rules
but did not run a reachability sweep. This pass did: a knip import-graph scan
over all of `src/` plus grep re-verification of every single candidate before
deletion (zero live importers required, name-twin files checked individually).

## What was removed

- **~200 files, ~14,000 lines** across nine commits: a superseded generation of
  bracket services (`src/services/brackets/{services,utils,database}` and root
  files), 20 orphan hooks and barrels, the dead playoffs team-selection/viewport
  UI cluster, the old `admin/matches/` UI, 31 unused ui primitives (sidebar and
  charts families and friends), a dead feature-flag subsystem, duplicate color/
  powerScore shims, stale generated types, ~20 components whose only references
  were their own tests (tests deleted with them), two finished codemods, and
  ~20 unreferenced public assets.
- **16 npm packages**: 14 dependencies (unused @radix-ui primitives,
  react-resizable-panels, usehooks-ts, sonner, input-otp, exceljs, nanoid,
  @types/uuid) and 2 devDependencies (@tailwindcss/typography, glob).
- Also fixed: two obsolete FAB tests that had been failing since the
  "Removed mobile FAB" change, plus stale README/SCHEDULER_README references.

## Verified-keep list (flagged by tooling but load-bearing)

- `supabase/functions/**` — deployed Deno edge functions; three are invoked via
  `functions.invoke`, `capture-power-snapshots` is cron-triggered
  (`supabase/config.toml`), `_shared/*` is imported by the functions, and the
  `*.test.ts` files run under `deno test` in CI.
- `public/progressier.js` — the PWA service worker.
- `src/types/brackets-viewer.d.ts`, `src/types/error-options.d.ts` — ambient.
- `events` package — brackets-manager extends EventEmitter in the browser.
- The entire scheduler (`blossom/`, `greedy/`, `dualBlock/`) — low coverage but
  live via the `dualMatchMode` toggle in `usePairingGenerator`.

## Effect on coverage

Global line coverage rose from 53.3% to ~62% purely from deleting untested dead
code; all enforced thresholds held throughout (no threshold was changed).

## Regression guard

`knip` now runs as a blocking PR check (`.github/workflows/knip.yml`, config in
`knip.json`). The config encodes the false-positive classes above and disables
export-level rules for now. Run locally with `npm run knip`.

## Deferred follow-ups

- **Export-level trimming**: knip reports ~285 unused exports, ~186 unused
  exported types, and ~50 duplicate exports inside otherwise-live files. The
  knip CI rules for these are off; tackle in a dedicated PR (never edit
  `src/integrations/supabase/types.ts` — auto-generated).
- **`supabase/functions/_shared/auth.ts`**: genuinely unreferenced, but inside
  the never-delete edge-function boundary; remove only with owner sign-off.
- **Threshold ratchet**: the new admin-area tests and the coverage jump justify
  raising the enforced floors in `vitest.config.ts` — do it in its own PR per
  the TESTING.md ratchet policy.

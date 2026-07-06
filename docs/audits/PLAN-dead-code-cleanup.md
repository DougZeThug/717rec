# PLAN: Dead-code cleanup + admin-area tests (2026-07)

> Working plan file per CLAUDE.md convention. Deleted in the final docs commit.
> Full findings + evidence: knip scan (164 unused files, 15+2 unused deps, 285 unused
> exports) with every candidate adversarially re-verified by grep before deletion.

## Phases / commits

- **A1–A9 (9 commits):** delete 181 verified-dead code files (~14.4k LOC) + 22 assets,
  grouped: brackets old generation → hooks → playoffs UI → admin UI → ui primitives →
  utils/config/types → misc components → test-only orphans (with their tests) →
  codemods/assets. Gate per batch: typecheck + build + targeted tests.
  Full coverage at M1 (after A4) and M2 (after A8).
- **B (1 commit):** remove 14 deps + 2 devDeps; fresh `npm ci` proof; keep `overrides`.
- **T1–T8 (8 commits):** new tests — RequestsTab, TimeslotsTab, useTimeslots,
  CreateDivisionDialog, useTeamRequests + useDivisionMutations, DivisionRow +
  DivisionsTab, rankingUtils branch top-up, HeadToHeadRecords + OpponentHistoryModal.
- **D1–D3 (3 commits):** knip + knip.json + blocking CI workflow; TESTING.md sync +
  audit note (this file deleted); coverage baseline refresh.

## Never delete (verified load-bearing)

supabase/functions/** (edge functions; capture-power-snapshots is cron-run),
public/progressier.js (PWA service worker), src/types/{brackets-viewer,error-options}.d.ts,
`events` package (brackets-manager polyfill), src/styles/brackets*.css (dynamic load),
the entire scheduler (blossom/greedy/dualBlock — live via dualMatchMode), and live
name-twins of deleted files (manager/services/BracketUpdateService, auto-schedule/tabs/TeamsTab,
batch-matches/auto-schedule/*, playoffs/ChampionDisplay (root), message-board/reactions/*,
teams/shared/TeamImage, ui/toggle-group + toggle-variants).

## Rules

- Re-grep every basename before its batch deletes it; unexpected live importer → pull from batch.
- Never lower coverage thresholds; if M2 dips, land tests T1–T3 before A8 instead.
- Threshold increases go in a separate follow-up PR (TESTING.md ratchet policy).

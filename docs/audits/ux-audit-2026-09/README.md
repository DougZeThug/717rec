# Evidence for `docs/audits/UX-AUDIT-2026-09.md`

- `screenshots/<pass>/<name>.jpg` — the captures cited in the report, reduced to ~50 % size. Passes: `anon` (public, production data as an anonymous visitor), `anon-extras` (light theme, offline, focus, menu, palette), `player` (fake member, mocked writes), `admin` (fake admin, fixtures + mocked writes), `journeys` (scripted walkthroughs).
- `coverage.csv` — one row per route/section × viewport: final URL, `h1`, text length, horizontal overflow, axe violations (serious/critical vs moderate/minor), tap targets under 24 px / 44 px, text under 12 px, and the committed screenshot path when the capture is cited in the report. Rows with an empty `screenshot` cell were captured and measured but their image was not committed, to keep the repository small.
- `axe-summary.json` — axe-core 4.13 violation nodes by rule, summed over every row in `coverage.csv` (public, admin and member loads).
- `guard-log.jsonl` — every request the write-guard refused to forward. Zero application writes reached production; the only aborted writes are the admin-only `admin_power_unification_status` RPC (8 calls) and third-party scripts.

Browser: Chromium via Playwright 1.62, timezone `America/New_York`, DPR 1. Widths: 360×740, 390×844, 430×932, 768×1024, 1440×900 (plus 844×390 landscape probes).

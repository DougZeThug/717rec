# Evidence index — 2026-07-15 quality review

All artifacts were produced in the review sandbox against commit `79744a0dedbebe9a43c3984e1b54b5c8ae2742fd`.

| File | What it proves |
|---|---|
| `typecheck.txt` | `npm run typecheck` exit 0 |
| `lint.txt` | `npm run lint` exit 0, no warnings |
| `test-summary.txt` | test totals (2 failed / 3,424 passed), coverage %, and the two failure details |
| `size.txt` | bundle budgets: entry 130.97 kB gz / 150 limit; total 1.01 MB gz / 1.2 MB limit |
| `knip.txt` | dead-code scan clean |
| `audit.txt` | `npm audit --omit=dev`: 0 vulnerabilities |
| `migration-replay.txt` | head/tail of the 334-migration replay onto fresh PG15 + all 7 SQL smoke suites passing (full log too large to commit) |
| `build.txt` | production build output (15.9s, chunk sizes) |
| `ground-truth-functions.sql` | exact `approve_match_result`, `reverse_team_stats`, and `v_team_details` definitions extracted from the replayed database |
| `scoring-verify.txt` | the 6 scoring experiments (S1 happy-path hand-check 95.0/50.0, S2 idempotency, S3 reverse round-trip, S4 drift reproduction, S5 dedupe, S6 determinism) |
| `db-security-audit.txt` | 0/70 SECURITY DEFINER functions without pinned search_path; RLS enabled on all tables; policy list for key tables |
| `e2e-local.txt` | local Playwright run summary (8 mocked specs passed; 6 networkidle timeouts = sandbox artifact; same suite green in CI run 29440142270) |
| `exploration-results-anon.json` | per-route × per-viewport: console errors, page errors, failed requests, content-rendered, horizontal-overflow, plus the write-guard abort log; `screenshot` fields are repo-relative for the 14 committed captures and marked `screenshot_committed: false` for the rest |
| `exploration-results-admin.json` | authenticated admin audit of /admin, /admin/notifications, /my-team at 2 viewports (per-route console errors, page errors, failed requests; credentials excluded) |
| `exploration-results-admin-sections.json` | section-only walk of all 18 admin sidebar sections (per-section: label, load OK, rendered text length, deduped non-sandbox console errors) — narrower fields than the per-route JSONs by design; the guard abort log at the bottom is the write-safety record for this phase |
| `screenshots/` | representative captures (all three viewports, public + admin) |

**Write-safety:** both exploration phases ran behind a network-layer guard that aborted every `PATCH`/`PUT`/`DELETE` and every `POST` except (a) read-only `get_*`-style RPCs and (b) the single login call in the admin phase. The `abortedRequests` array inside each exploration JSON is the complete log of write attempts that were blocked; production data was not modified.

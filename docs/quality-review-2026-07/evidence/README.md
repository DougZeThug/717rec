# Evidence index — 2026-07-15 quality review

All artifacts were produced in the review sandbox against commit `79744a0dedbebe9a43c3984e1b54b5c8ae2742fd`.

| File | What it proves |
|---|---|
| `typecheck.log` | `npm run typecheck` exit 0 |
| `lint.log` | `npm run lint` exit 0, no warnings |
| `test-summary.txt` | test totals (2 failed / 3,424 passed), coverage %, and the two failure details |
| `size.log` | bundle budgets: entry 130.97 kB gz / 150 limit; total 1.01 MB gz / 1.2 MB limit |
| `knip.log` | dead-code scan clean |
| `audit.log` | `npm audit --omit=dev`: 0 vulnerabilities |
| `migration-replay.log` | head/tail of the 334-migration replay onto fresh PG15 + all 7 SQL smoke suites passing (full log too large to commit) |
| `ground-truth-functions.sql` | exact `approve_match_result`, `reverse_team_stats`, and `v_team_details` definitions extracted from the replayed database |
| `scoring-verify.log` | the 6 scoring experiments (S1 happy-path hand-check 95.0/50.0, S2 idempotency, S3 reverse round-trip, S4 drift reproduction, S5 dedupe, S6 determinism) |
| `db-security-audit.log` | 0/70 SECURITY DEFINER functions without pinned search_path; RLS enabled on all tables; policy list for key tables |
| `e2e-rerun.log` | Playwright mock-backend suite rerun on idle machine |
| `exploration-results-anon.json` | per-route × per-viewport: console errors, page errors, failed requests, content-rendered, horizontal-overflow, plus the write-guard abort log |
| `exploration-results-admin.json` | same for the authenticated admin audit (credentials excluded) |
| `screenshots/` | representative captures (all three viewports, public + admin) |

**Write-safety:** both exploration phases ran behind a network-layer guard that aborted every `PATCH`/`PUT`/`DELETE` and every `POST` except (a) read-only `get_*`-style RPCs and (b) the single login call in the admin phase. The `abortedRequests` array inside each exploration JSON is the complete log of write attempts that were blocked; production data was not modified.

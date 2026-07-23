# Brief status — 2026-07 quality review

Snapshot of resolution status for the PR-01…PR-16 brief set. Update this file
in the same PR that resolves a brief.

| Brief | Status | Notes |
|---|---|---|
| PR-01 fix failing unit tests | Resolved | Green `main`; suite passes. |
| PR-02 atomic score submit/edit | Resolved | `resubmit_match_result` RPC + hook rewiring. |
| PR-03 pin search_path on SECURITY DEFINER | Resolved | Migration + smoke test `security_definer_search_path.sql`. |
| PR-04 close last non-atomic write path | Resolved | Mass Score Entry uses `deleteMatchWithStatsReversal`. |
| PR-05 counter-drift detector | Resolved | `v_counter_drift`, `reconcile_team_counters()`, admin UI card. |
| PR-06 playoff results integrity | Resolved | `finalize_bracket_standings` RPC + tie rejection + seed resync. |
| PR-07 edge function hardening | Partially resolved | Rate limiter shipped; production tasks (`IP_HASH_SALT`, `TRUSTED_PROXY_COUNT` verification) are runbook items. |
| PR-08 mass score entry reliability | Resolved | Covered by PR-04 atomic delete. |
| PR-09 test coverage admin blind spots | Open | Coverage still below stretch target; no dedicated PR merged. |
| PR-10 hooks cache correctness | Resolved | Cache invalidation + realtime fixes across matches, timeslots, playoffs. |
| PR-11 data-page error/empty states | Resolved | Timeslot name fix + WeeklyRecap `.maybeSingle()`. |
| PR-12 a11y focus and polish | Open | No dedicated pass merged. |
| PR-13 brackets simplification | Superseded | Rolled into PR-06 playoff integrity work. |
| PR-14 third-party script hygiene | Resolved | Self-hosted fonts; editor script dev-only. |
| PR-15 doc truth sweep | Resolved | This PR. |
| PR-16 production settings runbook | Resolved | `docs/OPERATIONS.md` + League Night status tab. |

Individual brief files remain unchanged for historical context; consult this
table before treating any brief as an open finding.
# Power-score rollout: apply, verify, revert

Runbook for migrations `20260811205000` – `20260812140000`.

These change how power scores are calculated **and rewrite stored history**, so
they get a backup and a tested way back. Everything below was exercised
end-to-end on a scratch Postgres: apply → revert → apply → revert, with the
restored data matching the pre-rollout snapshot byte for byte.

## What changes

| Migration | Effect |
|---|---|
| `20260811205000_power_score_rollout_backup` | **Backup only.** No behaviour change. |
| `20260811210000_power_score_weighted_denominators` | Restores true weighted averages; lifts the `100 × avg opponent weight` ceiling |
| `20260812110000_fix_member_update_guard_is_hidden` | Fixes a trigger that threw on every non-admin team edit |
| `20260812120000_power_score_match_date` | Plumbing only. No behaviour change. |
| `20260812130000_power_score_historical_opponent_division` | Rates opponents by the division they were in on the match date; versions division weights; **backfills, then freezes archived seasons** |
| `20260812140000_power_score_formula_control_bypass` | Lets the Revert/Re-apply admin controls still write archived seasons |

Expect scores to move. On a reproduction of the real defect — a team that played
in Recreational, dropped out, and was moved to `Hidden` — the numbers went:

| Team | Before | After |
|---|---|---|
| 2-0 team that beat the dropout | 0.024 | 0.796 |
| 1-1 team that beat the dropout | **-0.182** | 0.460 |

Yes, negative. Every opponent of a dropped-out team was being penalised for
beating them.

---

## 1. Apply

Migrations do **not** reach the live database on their own — see
`docs/OPERATIONS.md` §6. Paste each file into the Supabase SQL Editor, **oldest
timestamp first**.

> **`20260811205000_power_score_rollout_backup.sql` must run first.**
> It refuses to leave an incomplete snapshot: if it cannot copy every
> `team_season_stats` row, or captures no object definitions, it raises and
> stops. A clean run prints:
>
> ```
> NOTICE: power-score rollout backup: 119 stat rows, 15 object definitions captured
> ```
>
> If you do not see that line with a plausible row count, **stop** — do not
> apply the rest.

It captures three things:

- `team_season_stats_pre_power_rollout` — every stored rating
- `team_details_pre_power_rollout` — the rendered standings, for before/after
- `power_score_rollout_ddl_backup` — executable `CREATE` statements for all 10
  views and 5 functions the rollout replaces, with `security_invoker` preserved

Then apply the remaining five, in order.

## 2. Verify

**Coverage — run this first.** It shows which source answered for each match:

```sql
SELECT s.name, r.resolved_by, count(*)
FROM public.v_power_score_team_matches_rated r
JOIN public.seasons s ON s.id = r.season_id
GROUP BY 1, 2 ORDER BY 1, 3 DESC;
```

Expect `snapshot_at_date` to dominate seasons from ~Dec 2025 on. **A large
`unresolved` count means matches are silently leaving the rating terms** —
investigate before telling anyone the numbers are final.

**Before/after, biggest movers first:**

```sql
SELECT t.name,
       round(b.power_score, 1) AS before,
       round(d.power_score, 1) AS after,
       round(d.power_score - b.power_score, 1) AS delta
FROM public.team_details_pre_power_rollout b
JOIN public.v_team_details d ON d.team_id = b.team_id
JOIN public.teams t ON t.id = b.team_id
WHERE b.power_score IS NOT NULL
ORDER BY abs(d.power_score - b.power_score) DESC NULLS LAST
LIMIT 25;
```

Both sides are on the 0-100 scale — the snapshot is taken straight from
`v_team_details`, so no conversion is needed. (`team_season_stats.power_score`
is the 0-1 one; don't mix them.)

**Sanity checks:**

- No score exceeds `100 × (highest division weight)`.
- No score is negative.
- Teams that beat a dropped-out team went **up**.
- W-L records are unchanged — the rollout never alters them.

## 3. Revert

`supabase/scripts/revert_power_score_rollout.sql`. Deliberately **not** a
migration: CI replays every migration, and as one it would undo the rollout on
every run.

Paste it into the SQL Editor. It runs in a single transaction — if any step
raises, nothing is applied. It:

1. Refuses to run if the backup tables are missing or empty
2. Drops what the rollout added
3. Drops the replaced views, dependents first
4. Recreates them from the snapshot in dependency order, plus the functions
5. Re-grants `SELECT` to `anon, authenticated` (grants are not carried in
   `pg_get_viewdef`)
6. Restores `team_season_stats` and deletes rows the rollout created
7. Verifies zero rows still differ from the snapshot, or raises

Views are **dropped and recreated**, not replaced: `CREATE OR REPLACE VIEW`
cannot remove a column, and the rollout added `match_date`.

> **After reverting, remove the migration files too** — or revert the PR.
> They are still in the repo, so the next person applying migrations by hand
> will roll you straight forward again.

`division_weight_history` and `division_archive_distrust` are deliberately
**kept** on revert. They are additive, nothing reads them once the views are
gone, and the weight history is real observational data that cannot be
recreated once discarded.

## 4. Cleaning up

Drop the backups only once the new numbers have been accepted on the live site.
After that a revert is no longer possible without a repo checkout.

```sql
DROP TABLE public.team_season_stats_pre_power_rollout;
DROP TABLE public.team_details_pre_power_rollout;
DROP TABLE public.power_score_rollout_ddl_backup;
```

## Known behaviour after the rollout

- **Movers shows a one-time jump** the week this ships. `power_score_snapshots`
  rows are deliberately left alone — they record what was true that week, and
  rewriting them would erase the trend history. Self-corrects at the next
  weekly snapshot.
- **Archived seasons are frozen.** Routine writes no longer touch their
  `power_score`, `sos` or `division_name`. Use
  `admin_recompute_season_power('<season_id>')` for a deliberate repair; the
  Revert/Re-apply formula controls bypass the freeze automatically.
- **Weight history starts at the rollout.** Weight edits made before it are not
  recoverable — none were ever recorded.

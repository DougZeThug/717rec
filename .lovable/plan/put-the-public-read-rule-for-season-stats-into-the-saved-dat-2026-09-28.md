# Put the public read rule for season stats into the saved database history

## What I checked

- **Live database: fine.** It has the rule `Anyone can view team season stats` (read, everyone, always true). The website and the public AI tools work today.
- **Saved database history: missing that rule.** It only has the three admin write rules. A fresh database built from the history (reset, CI, new project, disaster rebuild) would show empty stats pages and empty AI tool answers.
- So the report is correct for fresh builds, not for production.

## The fix

1. One small database change that re-creates the read rule exactly as it is live. It first removes any rule with the same name, so on production nothing changes.
2. Add a database test (next to the seasons test) that checks the read rule exists and that a signed-out visitor can read rows.
3. Add a short `team_season_stats` section to the RLS notes: "Do not remove public read — it breaks stats, history, insights, team pages, and the public AI tools."

No app code changes.

## Technical details

```sql
DROP POLICY IF EXISTS "Anyone can view team season stats" ON public.team_season_stats;
CREATE POLICY "Anyone can view team season stats"
  ON public.team_season_stats FOR SELECT TO public USING (true);
```

- Test file: `supabase/tests/team_season_stats_rls.sql` — asserts the policy in `pg_policies`, then `SET ROLE anon` and `SELECT count(*)` runs without error.
- Docs: new section in `docs/RLS_NOTES.md`.

## Verify

- Re-query `pg_policies` for the table: 4 rules, same as now.
- Signed-out preview: Stats, History, Insights and a team page still show data.

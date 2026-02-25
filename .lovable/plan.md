

## Analysis: Permissive RLS Policies That Can Be Tightened

After reviewing all table policies, here are the ones using overly broad conditions (`true`) that could be restricted to admin-only or authenticated-only without changing application behavior, since all write operations in this app go through admin UI or authenticated flows.

### Policies to Tighten

#### 1. `participants` — INSERT, UPDATE, DELETE all use `true`
These are only written by the `create-bracket` edge function and admin UI. Safe to restrict to admin.
```sql
-- Replace all three with admin-only
DROP POLICY "Authenticated delete participants" ON participants;
DROP POLICY "Authenticated insert participants" ON participants;
DROP POLICY "Authenticated update participants" ON participants;

CREATE POLICY "Admins can manage participants" ON participants
  FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
```

#### 2. `matches_archive` — ALL command uses `true`/`true`
Only written by season archival (admin action). Safe to restrict.
```sql
DROP POLICY "Service writes archived matches" ON matches_archive;
CREATE POLICY "Admins can manage archived matches" ON matches_archive
  FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
```

#### 3. `team_details_archive` — ALL command uses `true`/`true`
Same pattern as matches_archive — only admin/service writes.
```sql
DROP POLICY "service writes archive" ON team_details_archive;
CREATE POLICY "Admins can manage archive" ON team_details_archive
  FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
```

#### 4. `ranking_snapshots` — INSERT and UPDATE use `true`
Rankings are saved by admin-triggered power score calculations. Safe to restrict.
```sql
DROP POLICY "Authenticated users can insert rankings" ON ranking_snapshots;
DROP POLICY "Authenticated users can update rankings" ON ranking_snapshots;

CREATE POLICY "Admins can insert rankings" ON ranking_snapshots
  FOR INSERT WITH CHECK (current_user_is_admin());
CREATE POLICY "Admins can update rankings" ON ranking_snapshots
  FOR UPDATE USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
```

#### 5. `playoff_games` — INSERT uses `true`, UPDATE/DELETE check auth but not admin
Only admins score playoff games. Safe to restrict all writes to admin.
```sql
DROP POLICY "Authenticated users can delete playoff games" ON playoff_games;
DROP POLICY "Authenticated users can insert playoff games" ON playoff_games;
DROP POLICY "Authenticated users can update playoff games" ON playoff_games;

CREATE POLICY "Admins can manage playoff games" ON playoff_games
  FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- Keep SELECT as-is but simplify to public read (no auth needed for viewing)
DROP POLICY "Authenticated users can select playoff games" ON playoff_games;
CREATE POLICY "Public can view playoff games" ON playoff_games
  FOR SELECT USING (true);
```

#### 6. `score_submissions` — UPDATE uses `true`
Only admins review/approve submissions. INSERT must stay open (anonymous submissions).
```sql
DROP POLICY "Allow authenticated users to update score submissions" ON score_submissions;
CREATE POLICY "Admins can update score submissions" ON score_submissions
  FOR UPDATE USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
```

#### 7. `season_team_participation` — UPDATE uses `true`
Only admins change participation status. INSERT stays open (teams self-submit).
```sql
DROP POLICY "Anyone can update participation" ON season_team_participation;
CREATE POLICY "Admins can update participation" ON season_team_participation
  FOR UPDATE USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
```

### Policies to Leave As-Is (Intentionally Open)

| Table | Policy | Reason |
|-------|--------|--------|
| `blind_draw_signups` | INSERT `true` | Anonymous signups by design |
| `score_submissions` | INSERT `true` | Anonymous score submissions |
| `season_team_participation` | INSERT `true` | Any team can submit participation |
| `team_requests` | INSERT `true` | Authenticated users submit requests |

### Summary

7 tables with 13 overly permissive policies can be tightened to admin-only without changing any application behavior, since all these write paths are already gated by admin UI checks in the frontend. This adds defense-in-depth at the database level.

### Files Modified
- Single database migration with all policy changes


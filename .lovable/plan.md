

## Analysis: Realtime & Storage Security Findings

### Finding 1: `realtime.messages` no RLS — **FALSE POSITIVE, should be ignored**

The `realtime.messages` table is in the **`realtime` schema**, which is a Supabase-reserved schema that we cannot and should not modify (per Supabase guidelines: modifying `auth`, `storage`, `realtime`, `supabase_functions`, or `vault` schemas can cause service degradation).

More importantly, this finding is irrelevant to your app because:

- All 7 realtime subscriptions in the codebase use **`postgres_changes`** only (no Broadcast or Presence channels)
- `postgres_changes` authorization is governed by **RLS on the source tables** (`messages`, `match_comments`, `match_reactions`, `playoff_matches`, `match`, `brackets`), not by `realtime.messages`
- All those source tables already have RLS enabled
- Since all data in this app is public/read-accessible to authenticated users (league data, messages, reactions), the channel topic names don't expose private data

**Action**: Ignore this finding with an explanation.

### Finding 2: Storage `team-images` bucket DELETE/UPDATE policies — **REAL, already partially fixed**

The previous migration fixed the `teams` bucket INSERT policy. However, the `team-images` bucket still has permissive DELETE and UPDATE policies. Since these were flagged alongside the INSERT fix, we should tighten them too.

**Action**: Create a migration to replace the DELETE and UPDATE policies on `team-images` with ownership-scoped policies (same pattern as the INSERT fix — admin OR approved team member matching folder path).

### Implementation

1. **Ignore** the `realtime_messages_no_rls` finding (reserved schema, all channels use postgres_changes with RLS on source tables)
2. **One migration** to fix `team-images` storage DELETE and UPDATE policies:
   - Drop `Allow authenticated users to delete team images`
   - Drop `Allow authenticated users to update team images`
   - Create ownership-scoped replacements using `current_user_is_admin()` OR `team_memberships` check with `(storage.foldername(name))[1]`


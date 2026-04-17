

Let me explore the relevant files first.
<lov-tool-use id="toolu_vrtx_01Ba3xqKhH3WyckoVqJt3cYp" name="code--exec" integration-id="code" data="{\"command\": \"grep -n \\\"any\\\" src/utils/matchTransformers.ts | head -40\", \"user_facing_description\": \"Checking any usage in matchTransformers\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01VPBLWxDXC4GRWyAfuEAwPJ" name="code--exec" integration-id="code" data="{\"command\": \"ls src/types/ && grep -n \\\"matches\\\\|playoff_matches\\\\|playoff_games\\\" src/integrations/supabase/types.ts | head -20\", \"user_facing_description\": \"Locating generated types\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01CmpvfLXwBgLQeEjBwsGqBK" name="code--exec" integration-id="code" data="{\"command\": \"grep -n \\\"any\\\" src/utils/matchTransformers.ts\", \"user_facing_description\": \"Listing any usages\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WG4fZ3Bz454iYw1sirRRMf" name="code--exec" integration-id="code" data="{\"command\": \"ls src/types/ 2>&1; echo \\\"---\\\"; ls src/integrations/supabase/\", \"user_facing_description\": \"Locating generated types\"}">
</lov-tool-use>
<lov-plan>

## Plan: Replace `any` in `matchTransformers.ts` with proper types

### Goal
Remove all 12 `any` annotations in `src/utils/matchTransformers.ts` without changing runtime behavior. These transformers normalize raw Supabase rows (sometimes with joined teams or playoff games) into our app types.

### Approach: input rows are unions, not single Row types

The transformers don't receive a clean `Database['public']['Tables']['matches']['Row']` — they receive that row plus optional joined data (teams, playoff_games) that may arrive as object, array, or missing. Forcing the generated `Row` type would lie about what's actually there.

The safe pattern: define **narrow input interfaces** that describe only the fields each transformer reads, with `unknown`/optional joined fields. Behavior is unchanged because we only narrow types — we don't add validation, throws, or transformations.

### Specific changes

**1. New input row interfaces** at the top of `matchTransformers.ts`:

```ts
// Raw team join (object or array, depending on join syntax)
type RawTeamJoin = {
  id?: string;
  team_id?: string;
  name?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
  divisionname?: string | null;
  divisionName?: string | null;
  division_id?: string | null;
  power_score?: number | null;
  sos?: number | null;
} | null | undefined;

interface RawMatchRow {
  id: string;
  team1_id?: string | null;
  team2_id?: string | null;
  team1_score?: number | null;
  team2_score?: number | null;
  date?: string | null;
  created_at?: string | null;
  location?: string | null;
  iscompleted?: boolean | null;
  winner_id?: string | null;
  loser_id?: string | null;
  round_number?: number | null;
  position?: number | null;
  bracket_id?: string | null;
  match_type?: Match['match_type'];
  next_match_id?: string | null;
  next_loser_match_id?: string | null;
  best_of?: number | null;
  team1_game_wins?: number | null;
  team2_game_wins?: number | null;
  team1?: RawTeamJoin | RawTeamJoin[];
  team2?: RawTeamJoin | RawTeamJoin[];
}

interface RawPlayoffGameRow {
  id: string;
  match_id: string | null;
  game_number: number;
  team1_score: number | null;
  team2_score: number | null;
  winner_id: string | null;
}

interface RawPlayoffMatchRow {
  id: string;
  bracket_id?: string | null;
  round?: number | null;
  position?: number | null;
  team1_id?: string | null;
  team2_id?: string | null;
  winner_id?: string | null;
  loser_id?: string | null;
  team1_score?: number | null;
  team2_score?: number | null;
  team1_game_wins?: number | null;
  team2_game_wins?: number | null;
  match_type?: PlayoffMatch['matchType'];
  best_of?: number | null;
  team1_seed?: number | null;
  team2_seed?: number | null;
  next_win_match_id?: string | null;
  next_lose_match_id?: string | null;
  next_match_id?: string | null;
  next_loser_match_id?: string | null;
  status?: string | null;
  iscompleted?: boolean | null;
  playoff_games?: RawPlayoffGameRow[];
  team1?: RawTeamJoin | RawTeamJoin[];
  team2?: RawTeamJoin | RawTeamJoin[];
}

interface RawRealtimePlayoffMatch extends Omit<RawPlayoffMatchRow, 'playoff_games'> {}
```

**2. Function signature swaps (no body changes):**

| Function | Before | After |
|---|---|---|
| `extractTeamDetails` | `team: any` | `team: RawTeamJoin \| RawTeamJoin[]` |
| `extractPlayoffTeam` | `team: any` | `team: RawTeamJoin \| RawTeamJoin[]` |
| `transformPlayoffGame` | `game: any` | `game: RawPlayoffGameRow` |
| `transformDatabaseMatch` | `match: any` | `match: RawMatchRow` |
| `transformDatabaseMatches` | `matches: any[]` | `matches: RawMatchRow[]` |
| `transformDatabasePlayoffMatch` | `match: any` | `match: RawPlayoffMatchRow` |
| `.filter((g: any) => …)` | `g: any` | `g: RawPlayoffGameRow` |
| `transformDatabasePlayoffMatches` | `matches: any[]` | `matches: RawPlayoffMatchRow[]` |
| `transformRealtimePlayoffMatch` | `payload: any` | `payload: RawRealtimePlayoffMatch` |
| `transformDatabasePlayoffMatchWithTeams` | `match: any` | `match: RawPlayoffMatchRow` |
| `transformDatabasePlayoffMatchesWithTeams` | `matches: any[]` | `matches: RawPlayoffMatchRow[]` |

**3. Body-level adjustments (minimal):**
- `extractTeamDetails`: keep `Array.isArray` branch — types already allow it.
- Inside `transformDatabaseMatch`, `match.team1`/`match.team2` are passed to `extractTeamDetails` — types align.
- No `as` casts needed except possibly one narrow cast where the generated `Match['match_type']` enum is assigned — verify in implementation.

### Safety: zero behavior change
- No runtime code added or removed.
- No `??`/`||` operators changed.
- No new validation or throws.
- All call sites still pass the same shapes (Supabase responses with `.select('… , team1:teams(...)')`).

### Verification steps after implementation
1. `npx tsc --noEmit` must pass with zero new errors.
2. `npx eslint src/utils/matchTransformers.ts` must report 0 problems (down from 12).
3. Smoke test in preview: open Schedule, Standings, Playoffs, and Mass Score Entry pages — all consume these transformers.
4. Confirm bracket realtime updates still flow (previously fixed).

### What changes
- **1 file edited**: `src/utils/matchTransformers.ts` (~50 lines added for interfaces, 12 signature swaps).
- **0 other source files changed** — interfaces are file-local; exported function signatures still accept the same runtime shapes.
- **0 migrations**.

### Rollback
If anything breaks, revert the single file. No DB or call-site changes to undo.


## Build errors found

Running `tsgo --noEmit` on `tsconfig.app.json` surfaces two failing files:

### 1. `src/components/admin/mass-score-entry/utils/matchTransformUtils.ts`

Two distinct issues introduced by recent type tightening in `src/utils/matchTransformers.ts`:

- **`team1_game_wins` / `team2_game_wins` types** — `MassScoreDatabaseMatch` widens these to `number | string | null`, but `RawMatchRow` (the parameter type of `transformDatabaseMatch`) only accepts `number | null`. The cast at line 25 fails.
- **`match.team1.id` / `.name` / `.image_url` / `.logo_url` access (lines 44–47, 62–65)** — `RawTeamJoin` is `RawTeamJoinObject | RawTeamJoinObject[] | null | undefined`. Direct property access on the union (array form) is rejected. Centralized `extractTeamDetails` exists in `matchTransformers.ts` but this file is doing the mapping inline.

**Fix plan:**
- Normalize game-wins to `number | null` before delegating to `transformDatabaseMatch` (parse the string/number once at the top, then pass the normalized value through). This removes the need for the widened type on the input shape.
- Guard team join access by reducing the union to a single object: `const team1 = Array.isArray(match.team1) ? match.team1[0] : match.team1;` (same for team2), then read `team1?.id`, `team1?.name`, etc. This mirrors the pattern in `matchTransformers.extractTeamDetails`.

### 2. `src/utils/autoScheduleUtils.ts` (line 69)

`TimeslotQueryService.fetchTeamsByTimeslot` returns Supabase's inferred row type, where the `teams:team_id(...)` join is reported as a `SelectQueryError<"column 'sos' does not exist on 'team_id'.">`. The current `as TeamsByTimeslotRow[]` cast is rejected because the source type doesn't overlap.

**Fix plan:** Cast through `unknown` first — `(timeslotData as unknown as TeamsByTimeslotRow[] | null)` — to acknowledge the deliberate narrowing of the Supabase inference error. No runtime change; this only quiets the compiler. (The underlying Supabase join is valid at runtime; the error is purely an inference artifact from the embed alias `divisionName:divisions(name)` colliding with column inference.)

### Verification

After the edits, re-run `npx tsgo --noEmit -p tsconfig.app.json` and expect zero errors.

### Out of scope

No runtime behavior changes, no schema changes, no test changes. Only the two source files above are touched.
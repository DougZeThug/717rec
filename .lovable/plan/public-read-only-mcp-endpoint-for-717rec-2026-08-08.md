# Public read-only MCP endpoint for 717rec

Add a second MCP server alongside the existing OAuth-protected one, so an agent
(Claude Code, Codex, or a non-interactive session) can read public league data —
including live bracket data — without any login step. The existing protected
server is unchanged: personal and admin tools stay behind OAuth.

## Access decision

The public endpoint is callable by anyone on the internet, with no
authentication. It will only expose data that is already publicly readable on the
website: standings, schedule, teams, divisions, and playoff brackets. Verified in
the database that `anon` already has read access to every table involved
(`teams`, `team_season_stats`, `matches`, `seasons`, `divisions`, `playoff_matches`,
and the bracket tables `stage` / `round` / `match` / `participant` / `group`).

No personal data, no admin tools, no counter-drift, no service-role key.

## What gets built

New public tools (no auth, `anon` role only):
- `list_teams` — teams in the active season with division and record
- `get_standings` — active-season standings by power score, optional division filter
- `get_schedule` — upcoming / recent / all matches, optional team filter
- `get_bracket` — playoff bracket for the active season: stages, rounds, matches,
  participants, scores, and status, ready to answer "who plays who next"

Each mirrors the existing protected tool's shape, minus the auth checks.

## Technical notes

- New entry `src/lib/mcp/public/index.ts` using `defineMcp` with **no** `auth`
  block, plus tool files under `src/lib/mcp/public/tools/`.
- Second `mcpPlugin({ entry: 'src/lib/mcp/public/index.ts', functionName: 'mcp-public' })`
  in `vite.config.ts` — the plugin supports an entry/function-name pair, so it
  emits `supabase/functions/mcp-public/index.ts` next to the existing `mcp` one.
- A shared `anonClient()` helper builds a Supabase client from `SUPABASE_URL` +
  the publishable/anon key, sends no `Authorization` header, and never touches
  `SUPABASE_SERVICE_ROLE_KEY`. RLS runs as `anon`.
- `supabase/config.toml`: add `[functions.mcp-public] verify_jwt = false`.
- `.mcp.json`: add a `717rec-public` server pointing at
  `https://wcitdamvochthvxvtxyb.supabase.co/functions/v1/mcp-public`.
- Regenerate the MCP manifest and deploy the `mcp-public` function.

## Verification

- Call the deployed endpoint with no credentials and confirm `tools/list` returns
  the four tools and `get_bracket` returns real bracket rows.
- Confirm the existing `mcp` endpoint still requires OAuth and still lists its
  nine tools.
- `npm run typecheck`, `npm run lint`, `npm run build`.
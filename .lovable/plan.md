

## Hardening: Case-insensitive UUID comparison in applyMatchResult

### Change

**`src/hooks/team-stats/utils/teamRecordUtils.ts`** -- Normalize both `winnerId` and `loserId` with `.toLowerCase()` at the top of the function, before the equality check and before passing them to the RPC call.

This is a defensive measure only; all UUIDs currently arrive from PostgreSQL in lowercase, so no functional change is expected.




## Fix Build Errors

Two issues breaking the build:

### 1. Missing `catch` block in `TeamStatsService.ts` (line 45-64)

The `try` block has no `catch` or `finally`. The `catch` was likely lost in a previous edit. Fix: add a `catch` block that re-throws.

**File: `src/services/TeamStatsService.ts`** (line 63-64)

Replace the closing `}` of `try` and `}` of the function with:
```typescript
  } catch (err) {
    errorLog('Failed to apply match result:', err);
    throw err;
  }
}
```

### 2. Implicit `any` types in `capture-power-snapshots/index.ts`

The edge function RPC call returns untyped data. Add an interface and type the `teams` variable.

**File: `supabase/functions/capture-power-snapshots/index.ts`**

Add an interface before `Deno.serve`:
```typescript
interface TeamPowerScore {
  team_id: string;
  power_score: number;
  sos: number;
  wins: number;
  losses: number;
  game_wins: number;
  game_losses: number;
  division_id: string | null;
}
```

Then cast the RPC result: `const teams = teamsData as TeamPowerScore[] | null;` (renaming `data: teams` to `data: teamsData`).

**Two files, minimal changes.**


# Plan: Fix Loose `any` Types in the Brackets Service Layer

## Overview

This plan removes all loose `any` type annotations from six files in `src/services/brackets/` and replaces them with precise TypeScript types. Every change is **purely at the type level** — no runtime logic, values, or behavior changes. The goal is to give TypeScript accurate information so it can catch future bugs automatically, while leaving all existing functionality exactly as-is.

Files are listed in dependency order.

---

## File 1: `src/services/brackets/types.ts`

### What changes

The four `any[]` / `any[][]` fields in `BracketMatchesByType` are replaced with `PlayoffMatch[]` variants. `PlayoffMatch` is imported.

### Before (lines 1–9)

```typescript
export interface BracketMatchesByType {
  winners: any[][];
  losers: any[][];
  finals: any[];
  playIn?: any[][];
}
```

### After

```typescript
import { PlayoffMatch } from '@/types';

export interface BracketMatchesByType {
  winners: PlayoffMatch[][];
  losers: PlayoffMatch[][];
  finals: PlayoffMatch[];
  playIn?: PlayoffMatch[][];
}
```

### Safety note

`matchGroupers.ts` already pushes `PlayoffMatch` objects into these arrays — the concrete values were always `PlayoffMatch` at runtime. We're simply telling TypeScript what was always true. No callers need to change.

---

## File 2: `src/services/brackets/utils/BracketConversionUtils.ts`

### What changes

Add a local `BracketsManagerMatch` interface describing the raw shape from brackets-manager. Use it in both function signatures, type the three intermediate arrays, and change the return type of `mapBracketsToAppFormat` from `any` to `BracketMatchesByType`.

### After (additions after existing import on line 1)

```typescript
import { PlayoffMatch } from '@/types';

import { BracketMatchesByType } from '../types';

/**
 * Raw match shape from brackets-manager library
 */
interface BracketsManagerMatch {
  id: string;
  round: number;
  position: number;
  group: 'WINNER' | 'LOSER' | 'FINAL';
  opponent1: {
    id: string | null;
    position?: number | null;
    score?: number | null;
    result?: string | null;
  } | null;
  opponent2: {
    id: string | null;
    position?: number | null;
    score?: number | null;
    result?: string | null;
  } | null;
  child_match_id?: string | null;
  child_match_id_loser?: string | null;
  best_of?: number;
}
```

**Line 6** — function signature and internal variables:

```typescript
// BEFORE
export function mapBracketsToAppFormat(bracketId: string, matches: any[]): any {
  const winnerMatches: any[][] = [];
  const loserMatches: any[][] = [];
  const finalsMatches: any[] = [];

// AFTER
export function mapBracketsToAppFormat(bracketId: string, matches: BracketsManagerMatch[]): BracketMatchesByType {
  const winnerMatches: PlayoffMatch[][] = [];
  const loserMatches: PlayoffMatch[][] = [];
  const finalsMatches: PlayoffMatch[] = [];
```

**Line 38** — second function:

```typescript
// BEFORE
export function convertToAppMatch(match: any, bracketId: string): PlayoffMatch {

// AFTER
export function convertToAppMatch(match: BracketsManagerMatch, bracketId: string): PlayoffMatch {
```

### Safety note

The `BracketsManagerMatch` interface is derived directly from what the function body reads (`match.id`, `match.round`, `match.group`, `match.opponent1`, etc.). TypeScript will confirm compatibility rather than block anything.

---

## File 3: `src/services/brackets/database/MatchMapper.ts`

### What changes

Add two local interfaces (`DatabasePlayoffMatch` for the incoming DB row, `DatabasePlayoffMatchInsert` for the outgoing object). Apply them to both function signatures. Change the null guard from `null as any` to `null as unknown as PlayoffMatch`.

### After (additions after existing import on line 1)

```typescript
/**
 * Shape of a playoff match row as returned from the database
 */
interface DatabasePlayoffMatch {
  id: string;
  round?: number;
  round_number?: number;
  position: number;
  team1_id?: string | null;
  team2_id?: string | null;
  winner_id?: string | null;
  loser_id?: string | null;
  team1_score?: number | null;
  team2_score?: number | null;
  team1_game_wins?: number | null;
  team2_game_wins?: number | null;
  match_type?: string;
  best_of?: number;
  team1_seed?: number | null;
  team2_seed?: number | null;
  metadata?: { team1_seed?: number | null; team2_seed?: number | null };
  next_win_match_id?: string | null;
  next_match_id?: string | null;
  next_lose_match_id?: string | null;
  next_loser_match_id?: string | null;
  bracket_id: string;
  status?: string;
  iscompleted?: boolean;
}

/**
 * Shape of a playoff match object ready for database insertion
 */
interface DatabasePlayoffMatchInsert {
  id: string;
  round: number;
  round_number: number;
  position: number;
  team1_id: string | null | undefined;
  team2_id: string | null | undefined;
  winner_id: string | null | undefined;
  loser_id: string | null | undefined;
  team1_score: number | null | undefined;
  team2_score: number | null | undefined;
  team1_game_wins: number | null | undefined;
  team2_game_wins: number | null | undefined;
  match_type: string;
  best_of: number | undefined;
  metadata: { team1_seed: number | null | undefined; team2_seed: number | null | undefined };
  next_win_match_id: string | null | undefined;
  next_lose_match_id: string | null | undefined;
  next_match_id: string | null | undefined;
  next_loser_match_id: string | null | undefined;
  bracket_id: string;
  status: string | undefined;
}
```

**Line 6** (was `toRuntime(dbMatch: any)`):

```typescript
// BEFORE
export function toRuntime(dbMatch: any): PlayoffMatch {
  if (!dbMatch) return null as any;

// AFTER
export function toRuntime(dbMatch: DatabasePlayoffMatch | null): PlayoffMatch {
  if (!dbMatch) return null as unknown as PlayoffMatch;
```

**Line 35** (was `toDatabase(match: PlayoffMatch): any`):

```typescript
// BEFORE
export function toDatabase(match: PlayoffMatch): any {

// AFTER
export function toDatabase(match: PlayoffMatch): DatabasePlayoffMatchInsert {
```

### Safety note

`null as unknown as PlayoffMatch` is functionally identical to `null as any` — both bypass the type system at the same point — but `as unknown as T` is the conventional safer form that makes the intentional workaround explicit.

---

## File 4: `src/services/brackets/validation/BracketValidationService.ts`

### What changes

Lines 24–27: replace four `(data as any).field` accesses with `(data as Record<string, unknown>).field`.

### Before (lines 24–27)

```typescript
    typeof (data as any).title === 'string' &&
    typeof (data as any).divisionId === 'string' &&
    typeof (data as any).format === 'string' &&
    Array.isArray((data as any).teams)
```

### After

```typescript
    typeof (data as Record<string, unknown>).title === 'string' &&
    typeof (data as Record<string, unknown>).divisionId === 'string' &&
    typeof (data as Record<string, unknown>).format === 'string' &&
    Array.isArray((data as Record<string, unknown>).teams)
```

### Safety note

By line 24, the code has already confirmed `typeof data === 'object'` and each key exists via `'title' in data` etc. `Record<string, unknown>` is the correct TypeScript idiom after those checks — more accurate than `any` and produces identical runtime behavior.

---

## File 5: `src/services/brackets/viewer/BracketsViewerAdapter.ts`

This file has the most changes. Work through them in method order.

### 5a. Add missing imports (lines 12–19)

**Before**:
```typescript
import {
  ViewerData,
  ViewerDataWithMapping,
  ViewerMatch,
  ViewerMatchGame,
  ViewerParticipant,
  ViewerStage,
} from './types';
```

**After**:
```typescript
import {
  BracketGroupRow,
  BracketRoundRow,
  ViewerData,
  ViewerDataWithMapping,
  ViewerMatch,
  ViewerMatchGame,
  ViewerParticipant,
  ViewerStage,
} from './types';
```

### 5b. Lines 154–159: Callback parameter types in `transformFromSql`

**Before**:
```typescript
    const wbGroup = groups.find((g: any) => g.number === 1);
    const wbR1RoundIds = new Set(
      rounds
        .filter((r: any) => r.group_id === wbGroup?.id && r.number === 1)
        .map((r: any) => r.id)
    );
```

**After**:
```typescript
    const wbGroup = groups.find((g: BracketGroupRow) => g.number === 1);
    const wbR1RoundIds = new Set(
      rounds
        .filter((r: BracketRoundRow) => r.group_id === wbGroup?.id && r.number === 1)
        .map((r: BracketRoundRow) => r.id)
    );
```

Safety: `groups` from the Supabase query `.select('id, number, stage_id')` matches `BracketGroupRow { id: number; stage_id?: number; number: number }` exactly. `rounds` from `.select('id, group_id, number')` matches `BracketRoundRow` exactly.

### 5c. Lines 241–246: `as any` casts in `transformFromSql` return block

**Before**:
```typescript
        stages: stages as any,
        groups: groups as any,
        rounds: rounds as any,
        matches: matchesWithSources as any,
        matchGames: transformedMatchGames as any,
        participants: transformedParticipants as any,
```

**After**:
```typescript
        stages: stages as unknown as ViewerStage[],
        groups: groups as BracketGroupRow[],
        rounds: rounds as BracketRoundRow[],
        matches: matchesWithSources,
        matchGames: transformedMatchGames,
        participants: transformedParticipants as ViewerParticipant[],
```

Notes per field:
- `stages`: Supabase returns `{ id, name, type, tournament_id }` but `ViewerStage` also needs `number` and `settings`. Double-cast (`unknown` first) documents the known gap — same semantics as `as any`.
- `groups` / `rounds`: Direct cast; shapes match exactly.
- `matchesWithSources`: No cast needed once `calculateSourceNodeIds` returns `ViewerMatch[]` (change 5f).
- `transformedMatchGames`: Already `ViewerMatchGame[]` from the `.map()` on line 206; no cast needed.
- `transformedParticipants`: Cast to `ViewerParticipant[]` confirms the `.map()` shape.

### 5d. Line 268: `toViewerOpponent` return type

**Before**:
```typescript
  ): any {
```

**After**:
```typescript
  ): NonNullable<ViewerMatch['opponent1']> {
```

Safety: The returned object `{ id, score, result, position, source_node_id, source_type }` exactly matches the inline opponent type from `ViewerMatch`. `NonNullable<>` strips the `| null` since this method always returns an object.

### 5e. Line 283: `ensureOpponentObject` parameter

**Before**:
```typescript
  private static ensureOpponentObject(match: any, key: 'opponent1' | 'opponent2') {
```

**After**:
```typescript
  private static ensureOpponentObject(match: ViewerMatch, key: 'opponent1' | 'opponent2') {
```

### 5f. Line 295: `calculateSourceNodeIds` signature

**Before**:
```typescript
  private static calculateSourceNodeIds(matches: any[], groups: any[], rounds: any[]): any[] {
```

**After**:
```typescript
  private static calculateSourceNodeIds(
    matches: ViewerMatch[],
    groups: BracketGroupRow[],
    rounds: BracketRoundRow[]
  ): ViewerMatch[] {
```

Safety: All three call sites pass correctly-typed arrays — the SQL path, the JSONB path (after 5j), and the `transform()` path.

### 5g. Line 314: Map type inside `calculateSourceNodeIds`

**Before**:
```typescript
    const matchesByGroupRound = new Map<string, any[]>();
```

**After**:
```typescript
    const matchesByGroupRound = new Map<string, ViewerMatch[]>();
```

### 5h. Lines 329, 355, 386, 447: Four inner helper functions

**Before** (four occurrences):
```typescript
    const addWinnersProgressionSources = (match: any) => {
    const addLosersProgressionSources = (match: any) => {
    const addWinnersToLosersDropIns = (match: any) => {
    const addGrandFinalSources = (match: any) => {
```

**After** (all four):
```typescript
    const addWinnersProgressionSources = (match: ViewerMatch) => {
    const addLosersProgressionSources = (match: ViewerMatch) => {
    const addWinnersToLosersDropIns = (match: ViewerMatch) => {
    const addGrandFinalSources = (match: ViewerMatch) => {
```

Safety: Each helper is only called with elements from `matches: ViewerMatch[]`.

### 5i. Lines 523–524: Symbol index assignment

**Before**:
```typescript
      if (m.opponent1) (m.opponent1 as any)[TAG] = `o1:${m.id}`;
      if (m.opponent2) (m.opponent2 as any)[TAG] = `o2:${m.id}`;
```

**After**:
```typescript
      if (m.opponent1) (m.opponent1 as Record<symbol, unknown>)[TAG] = `o1:${m.id}`;
      if (m.opponent2) (m.opponent2 as Record<symbol, unknown>)[TAG] = `o2:${m.id}`;
```

Safety: `Record<symbol, unknown>` is the correct TypeScript idiom for Symbol key assignment. Runtime behavior is identical.

### 5j. Lines 581–583: JSONB path intermediate variables

**Before**:
```typescript
    const matches = (bracketData.match || []) as any;
    const groups = (bracketData.group || []) as any;
    const rounds = (bracketData.round || []) as any;
```

**After**:
```typescript
    const matches = (bracketData.match || []) as unknown as ViewerMatch[];
    const groups = (bracketData.group || []) as BracketGroupRow[];
    const rounds = (bracketData.round || []) as BracketRoundRow[];
```

Safety: `bracketData` is `InMemoryDatabase['data']` from brackets-memory-db. Double-cast on `matches` acknowledges the library type differs from `ViewerMatch`. Direct casts for `groups`/`rounds` work because those shapes are simple `{ id, number, ... }` structs matching the interfaces.

### 5k. Lines 597, 601–602: JSONB return block remaining `as any` casts

**Before**:
```typescript
        stages: (bracketData.stage || []) as any,
        matchGames: (bracketData.match_game || []) as any,
        participants: (bracketData.participant || []) as any,
```

**After**:
```typescript
        stages: (bracketData.stage || []) as unknown as ViewerStage[],
        matchGames: (bracketData.match_game || []) as ViewerMatchGame[],
        participants: (bracketData.participant || []) as ViewerParticipant[],
```

### 5l. Lines 686–687: `transform()` method groups/rounds

**Before**:
```typescript
        groups: groups as any,
        rounds: rounds as any,
```

**After**:
```typescript
        groups: groups as BracketGroupRow[],
        rounds: rounds as BracketRoundRow[],
```

Safety: Both are hand-constructed arrays (lines 646–668) whose shapes are structurally compatible with `BracketGroupRow` and `BracketRoundRow`.

### 5m. Line 705: `bracket.participants` metadata access

**Before**:
```typescript
      const metadata = bracket.participants as any;
      grandFinalType = metadata.grandFinalType || 'simple';
```

**After**:
```typescript
      const metadata = bracket.participants as { grandFinalType?: string };
      grandFinalType = (metadata.grandFinalType as 'simple' | 'double' | undefined) || 'simple';
```

Safety: `bracket.participants` is typed in `PlayoffBracket` as `Array<{ position, team_id, name, ... }>` (not a JSONB blob) — it's narrowed to non-null object by the surrounding `if`. Casting to `{ grandFinalType?: string }` accesses only what the code uses. The inner cast to `'simple' | 'double' | undefined` is needed because `grandFinalType` is declared as that union on line 703.

---

## Implementation Order

Work through files in this sequence. Each step is independently compilable.

1. **`src/services/brackets/types.ts`** — Add `PlayoffMatch` import, fix `BracketMatchesByType`. Shortest, zero risk.
2. **`src/services/brackets/utils/BracketConversionUtils.ts`** — Add `BracketsManagerMatch` interface and `BracketMatchesByType` import, update function signatures and array types.
3. **`src/services/brackets/database/MatchMapper.ts`** — Add two interfaces, update function signatures and null guard.
4. **`src/services/brackets/validation/BracketValidationService.ts`** — Four-line mechanical swap of `as any` to `as Record<string, unknown>`.
5. **`src/services/brackets/viewer/BracketsViewerAdapter.ts`** — All remaining changes. Do import addition first (5a), then work top-to-bottom: 5b → 5c → 5d → 5e → 5f → 5g → 5h → 5i → 5j → 5k → 5l → 5m.

After each file, run `npm run lint` to confirm no new type errors before proceeding.

---

## Key Safety Principle

TypeScript types are fully erased at compile time — they produce zero bytes of JavaScript output. This means no runtime behavior, return values, or conditional logic can change. The only judgment calls are for cases where the concrete runtime shape doesn't precisely match the target type (e.g., `stages` missing `number`/`settings` fields from ViewerStage). In those cases the before code used `as any` (complete type bypass) and the after code uses `as unknown as TargetType` (same bypass, safer idiom that documents the intentional gap).

# ANY Phase 3 — Business-Critical Flows Plan

> **Resolution status:** Open — execution plan remains historical/planning material; do not treat individual items as current findings unless re-verified against code.

> **Revision 2 — 2026-05-12.** This document was rewritten end-to-end after a grounded file-by-file survey of every Phase 3 target. The original plan over-scoped the remaining work because it didn't credit the cleanup that has already shipped through Phase 2 follow-up PRs. This revision re-scopes Phase 3 to only what is still genuinely unsafe.

---

## A. Executive summary

### What Phase 3 is fixing
Phase 3 closes the remaining unsafe-`any` gaps in **business-critical write paths and side-effect flows** where bad types can:

- Persist a malformed bracket graph (edge function — still unfixed).
- Hide every failure mode of every badge RPC behind `Promise<unknown>` (badge service — still unfixed).
- Mislabel auth errors when surfaced through the shared error pipeline (auth service bridge cast — still unfixed).
- Pass arbitrary shapes through the playoff editing chain via three remaining hook-level casts (`usePlayoffEditMatch.ts`).

### What Phase 3 is explicitly NOT fixing
- No strict mode enablement.
- No broad eslint unsafe-any rollout.
- No DB schema, migration, or RLS changes.
- No bracket algorithm rewrite.
- No loser-bracket feed, BYE, or grand-finals reset behavior changes.
- No badge award logic changes.
- No auth behavior changes.
- No third-party type purity campaign.
- No mass UI cleanup.

### Why business-critical flows come after shared contracts
Phase 1 hardened the playoff read model. Phase 2 hardened shared abstractions, badge retry payloads, optimistic seed mutations, and recharts containment. Phase 3 now sits on top of those stable contracts and targets the **write side** and **boundary parsing** that previous phases deliberately left alone.

### Plain-English risk picture
- **The single biggest remaining risk is the create-bracket edge function.** It still types its generated match graph as `any[]`. A reviewer can't catch a field-shape mistake from a type error today — it would only show up after a malformed graph is persisted.
- **The second biggest is badge RPC return typing.** Every method returns `Promise<unknown>`. A silent failure (RPC returning an error envelope, awarding zero badges, etc.) is invisible to the compiler.
- **The auth bridge cast** is the third because it forges a `PostgrestError` shape from an `AuthError`. The forgery is what the rest of the app uses to talk about auth failures, which means auth error metadata is the wrong shape at every consumer.
- Everything else is either already done or is a one-line tightening.

### Expected risk level
**Medium overall** for the remaining work (it was rated "High" in the original plan, but more than half of the originally-scoped clusters are already clean). High concentration of risk in two files: the edge function and the badge service.

---

## A.1 Implementation status snapshot (verified 2026-05-12)

Status as it actually exists on `claude/plan-phase-3-any-remediation-UNsfh` today. Verified by reading every target file — quote line numbers in §B.

| PR | Title | Status | Evidence |
|---:|---|---|---|
| 1 | Phase 3 prereq / contract alignment | **MERGED** | Commit `8c3a5e4`, PR #609. `src/types/phase3.ts` re-exports shared contracts. |
| 2 | Create-bracket generator DTO typing | **OUTSTANDING** | `supabase/functions/create-bracket/index.ts:95, :164, :202, :653` still `any`. |
| 3 | Create-bracket insert payload typing | **OUTSTANDING** | Insert call sites (`brackets`, `participants`, `playoff_matches`) still pass loosely-typed objects. |
| 4 | Match edit read-model typing | **SUPERSEDED — partial work remains** | `BracketMatchReadService.ts` and `src/services/brackets/read/types.ts` are already cleanly typed (no casts). Three hook-side casts remain in `usePlayoffEditMatch.ts:95, :169, :185, :191`. Re-scoped as smaller "PR 4b" below. |
| 5 | Match score update input/result contracts | **SUPERSEDED — minor parity remains** | `MatchScoreEditor/types.ts` is clean. `MatchScoreEditorProps.onSave` is already typed. `usePlayoffMatchUpdate.ts` uses `as const` only for `'win' \| 'loss'` literals (safe). The only remaining unsafe pattern in this cluster is `PlayoffDialogs.tsx:21` `teamsByDivision: Record<string, any>`. Re-scoped as "PR 5b" below. |
| 6 | Badge RPC result typing | **OUTSTANDING** | Every public method on `BadgeProcessingService` returns `Promise<unknown>` (lines 6–199). |
| 7 | Badge retry queue typing + parser | **DONE** | `FailedBadgeOperationsService.ts` already has a discriminated `BadgeOperation` union, a runtime `isValidFailedBadgeOperation()` guard, and quarantine behavior. No further PR needed. |
| 8 | Seed mutation rollback/cache typing | **DONE** | `TeamSeedService.ts`, `BracketWriteService.ts`, `useOptimisticTeamMutations.ts`, and `useTeamSeedMutation.ts` are all cleanly typed today (no casts). No further PR needed. |
| 9 | Auth/native SDK boundary typing | **OUTSTANDING (narrow)** | Three real casts remain: `AuthService.ts:17` (`as unknown as PostgrestError`), `useAuthMethods.ts:21` (`data as { weakPassword?: WeakPasswordReasons }`), `nativeAuth.ts:49` (`response as NativeGoogleLoginResult`). |
| 10 | Third-party containment cleanup | **OUTSTANDING** | `src/types/brackets-viewer.d.ts` still declares `stages/groups/rounds/matches/matchGames/participants` as `any[]` and `opponent1/opponent2` as `any`. Adapter (`SupabaseSqlStorage.ts`) has only one local extension cast which is acceptable. |

### Plain-English takeaway
- Only **4 of the original 10 PRs** need real work: PR 2, PR 3, PR 6, PR 9. PR 4 and PR 5 collapse into much smaller "b" variants. PR 7 and PR 8 are done.
- Together this represents roughly **half** of the originally-scoped Phase 3 effort.

---

## B. Current findings by target area (file-grounded)

Every line number below was verified on the current branch.

### B1. Create-bracket edge function
**File:** `supabase/functions/create-bracket/index.ts` (917 lines).

| Line | Pattern | Bucket |
|---:|---|---|
| 95  | `const matches: any[] = [];` (single-elim generator) | Bracket graph generation any |
| 164 | `const pairs: Array<{ team1: any; team2: any }> = [];` (seeding pairs) | Bracket graph generation any |
| 202 | `const matches: any[] = [];` (double-elim generator) | Bracket graph generation any |
| 653 | `let bracketResult: any = null;` (format-branch result holder) | Bracket graph generation any |

Insert payloads are passed structurally to `supabaseAdmin.from('brackets').insert({...})` (line 608), `participants` (line 637), and `playoff_matches` (line 669) without explicit types. Today these are accepted because Supabase's generated `Database` types coerce on insert, but the *generator* output is not constrained, so a future drift between generator code and table shape would not be caught at compile time.

- **Touches write path:** yes.
- **Touches persisted data:** yes (`brackets`, `participants`, `playoff_matches`).
- **Touches brackets-manager behavior:** indirectly. The generated graph is what brackets-manager (or the legacy viewer) reads later.
- **Real truth or compiler silence:** compiler silence.

### B2. Match score update / edit flow

| File | Cast / pattern | Line | Notes |
|---|---|---:|---|
| `src/hooks/playoffs/usePlayoffEditMatch.ts` | `} as PlayoffBracket` | 95  | constructs single-match "bracket" wrapper from BM data |
| same | `} as PlayoffBracket` | 169 | constructs single-match "bracket" wrapper from legacy DB row |
| same | `matchData.match_type as PlayoffMatch['matchType']` | 185 | narrows DB string to union literal |
| same | `(matchData.status as 'pending' \| 'in_progress' \| 'completed')` | 191 | narrows DB string to union literal |
| same | `error as Error` | 272 | safe catch-block narrowing (acceptable) |
| `src/components/playoffs/dialogs/PlayoffDialogs.tsx` | `teamsByDivision: Record<string, any>` | 21 | weak prop bag for division → teams map |

Everything else in this flow is already clean. `BracketMatchReadService.ts` and `src/services/brackets/read/types.ts` are typed without casts. `MatchScoreEditor/types.ts` and `usePlayoffMatchUpdate.ts` are clean.

- **Touches write path:** yes (legacy and BM match update paths).
- **Touches persisted data:** yes.
- **Touches brackets-manager behavior:** yes (the BM-integer branch goes through `bracketManagerService.updateMatch`).
- **Real truth or compiler silence:** compiler silence at the four cast sites; everything around them is real type truth.

### B3. Badge processing and retry path

| File | Pattern | Lines | Bucket |
|---|---|---:|---|
| `src/services/BadgeProcessingService.ts` | every public method returns `Promise<unknown>` | 6–199 | Badge RPC/result any |
| `src/services/FailedBadgeOperationsService.ts` | already discriminated + runtime guard `isValidFailedBadgeOperation` | 22–96 | **Done — no change needed** |
| `src/hooks/matches/utils/matchDatabaseUtils.ts` | only `as const` narrowings on union discriminators | 81–148 | **Safe** |

Badge processing fires 9 RPCs in `processMatchBadges` (and several callers) and silently swallows their results because nothing inspects them. A failed RPC returns a typed Supabase error which today is invisible at the call site type signature.

- **Touches write path:** side-effect path after match write.
- **Touches persisted data:** badge tables via RPC.
- **Touches brackets-manager behavior:** no.
- **Real truth or compiler silence:** compiler silence on RPC envelopes.

### B4. Seed mutation confirmation / rollback path
Per the survey, **all four files in this cluster are already clean**:

- `src/services/teams/TeamSeedService.ts` — no casts. `updateTeamSeed` returns a typed `TeamSeedUpdateResult`. `bulkUpdateTeamSeeds` returns `BulkTeamSeedUpdateResult[]` via the typed RPC envelope.
- `src/services/brackets/BracketWriteService.ts` — no casts.
- `src/components/playoffs/form/bracket-teams/hooks/useOptimisticTeamMutations.ts` — typed `OptimisticUpdate` shape, typed `lastError: Error | null`, no casts.
- `src/components/playoffs/form/bracket-teams/hooks/useTeamSeedMutation.ts` — typed React Query 5 `UseMutationResult` returns. No casts.

There is **no Phase 3 work remaining here** unless we deliberately add documentation about cache key contracts. We aren't going to, because nothing is broken and the goal is to not change behavior.

- **Real truth or compiler silence:** real type truth.

### B5. Auth / native login boundary

| File | Cast | Line | What it does |
|---|---|---:|---|
| `src/services/auth/AuthService.ts` | `as unknown as PostgrestError` | 17 | `toPgError(AuthError)` fabricates a `PostgrestError` shape to feed `handleDatabaseError`. The fabricated object is missing required `PostgrestError` fields (the real type has more fields than the literal). |
| `src/utils/nativeAuth.ts` | `response as NativeGoogleLoginResult` | 49 | accepts the Capgo SDK response shape. The `NativeGoogleLoginResult` type already exists in `src/types/auth.ts` and tolerates either a nested `result` or a flat token bag. |
| `src/hooks/auth/useAuthMethods.ts` | `data as { weakPassword?: WeakPasswordReasons }` | 21 | post-signup narrowing to extract optional weak-password metadata that Supabase types as a top-level optional field. |

- **Touches write path:** no (auth/session only).
- **Touches persisted data:** indirectly via session lifecycle.
- **Touches brackets-manager behavior:** no.
- **Real truth or compiler silence:** the `AuthService` bridge is **active misdirection** — it claims to be a `PostgrestError` and isn't. The other two are compiler silence at SDK boundaries.

### B6. Third-party containment
**File:** `src/types/brackets-viewer.d.ts`.

| Line | Pattern |
|---:|---|
| 12  | `stages: any[]` |
| 13  | `groups?: any[]` |
| 14  | `rounds?: any[]` |
| 15  | `matches: any[]` |
| 16  | `matchGames: any[]` |
| 17  | `participants: any[]` |
| 32  | `opponent1?: any` |
| 33  | `opponent2?: any` |

This is a third-party UMD library declaration. The `any[]` choices were deliberate to accept the library's actual at-runtime shapes. Phase 2 already isolated other third-party `any` (recharts) behind containment helpers. Phase 3's PR 10 should bring this file under the same containment pattern — without breaking any rendering behavior.

`src/services/brackets/manager/SupabaseSqlStorage.ts` has one local extension cast (`p as DataTypes['participant'] & { position?: number }`) at line 39. This is **acceptable** — it is the canonical "library DTO with an app-specific optional field" containment pattern. Leave it.

---

## C. Create-bracket edge function — implementation plan

The PR 2 detailed spec from revision 1 is correct and is preserved below. PR 3 (insert-payload typing) gets a tighter spec here than revision 1 had.

### Planned generation-side contracts (PR 2)
Live in a new `supabase/functions/create-bracket/types.ts` (edge-only — Deno module, must NOT import from `@/...`).

```ts
export type BracketFormat = 'singleElim' | 'doubleElim';

export type GeneratedMatchType = 'winners' | 'losers' | 'finals';
export type GeneratedMatchStatus = 'pending';

export interface SeedTeam {
  id: string;
  name: string;
  seed?: number;
}

export interface SeedingPair {
  team1: SeedTeam | null;   // null = BYE
  team2: SeedTeam | null;
}

export interface GeneratedBracketMatch {
  id: string;
  bracket_id: string;
  round: number;
  position: number;
  match_type: GeneratedMatchType;
  team1_id: string | null;
  team2_id: string | null;
  team1_seed: number | null;
  team2_seed: number | null;
  next_win_match_id: string | null;
  next_lose_match_id: string | null;
  best_of: number;
  status: GeneratedMatchStatus;
}

export interface SingleElimGenerationResult {
  format: 'singleElim';
  matches: GeneratedBracketMatch[];
  matchIdMap: Map<string, string>;
}

export interface DoubleElimGenerationResult {
  format: 'doubleElim';
  matches: GeneratedBracketMatch[];
  winnersMatchIds: Map<string, string>;
  losersMatchIds: Map<string, string>;
  grandFinalsR1Id: string;
  grandFinalsR2Id: string;
}

export type GeneratedBracketResult =
  | SingleElimGenerationResult
  | DoubleElimGenerationResult;
```

### Planned insert-payload contracts (PR 3)
Same file. These represent the *write* boundary — the actual DB row shape on insert. The point is to make any drift between generator output and table shape a compile error.

```ts
export interface BracketInsertPayload {
  title: string;
  division_id: string;
  format: BracketFormat;
  state: 'pending';
  challonge_tournament_id: number;
}

export interface ParticipantInsertPayload {
  bracket_id: string;
  team_id: string;
  position: number;
  name: string;
}

/** Insert payload for one row in `playoff_matches`. Field-for-field identical to GeneratedBracketMatch. */
export type PlayoffMatchInsertPayload = GeneratedBracketMatch;
```

PR 3 then narrows the three insert call sites (line 608, 637, 669) to accept these types. No SQL changes, no column changes, no behavior changes.

### Behavior that MUST stay identical (PR 2 + PR 3)
- All nullability preserved (every `_id` and `_seed` and `next_*_match_id` field).
- `match_type` union stays `'winners' | 'losers' | 'finals'` — do not introduce `'play-in'`, `'consolation'`, or anything else; the algorithm doesn't emit them.
- `best_of` stays `number` (single-elim uses 3, grand finals use 5). Don't narrow to a union.
- `status` stays `'pending'` at generation time. Don't widen to the runtime status union.
- `format` discriminator added to each generator return must not be serialized into the DB insert (it stays in the in-memory generation result; the insert payload is `GeneratedBracketMatch` only).

---

## D. Match edit flow — implementation plan (re-scoped)

**Major change vs. original plan:** `BracketMatchReadService` is already cleanly typed. The original PR 4 ("type the read service") is therefore done. What remains is removing the four casts that still live in `usePlayoffEditMatch.ts`.

### What to replace and how

1. **Lines 95 and 169 — `} as PlayoffBracket`.** The hook builds a single-match "wrapper bracket" to feed the editor. Today it builds an object literal then casts. The safest fix is:
   - Define a small helper `buildEditorBracketForMatch(match: PlayoffMatch): PlayoffBracket` next to the hook (not in service), which constructs the bracket from typed inputs.
   - Helper returns a real `PlayoffBracket` so the cast disappears at the call site without altering the runtime object.

2. **Line 185 — `matchData.match_type as PlayoffMatch['matchType']`.** This is a DB-string-to-union narrowing. The right fix is a small guard:
   ```ts
   const parseMatchType = (raw: string): PlayoffMatch['matchType'] => {
     if (raw === 'winners' || raw === 'losers' || raw === 'finals') return raw;
     return 'winners'; // existing implicit fallback — keep behavior
   };
   ```
   Live this in `src/services/brackets/read/` next to the existing read types so the read layer owns the parsing, not the hook.

3. **Line 191 — status cast `as 'pending' | 'in_progress' | 'completed'`.** Same pattern: a `parseLegacyMatchStatus` guard with the existing `'pending'` fallback (line 191 already has `|| 'pending'` — preserve that).

4. **Line 272 — `error as Error`.** This is a defensive narrowing inside a catch block. **Leave it.** Replacing it with `error instanceof Error ? error : new Error(String(error))` is a behavior tweak and outside scope.

### What MUST stay identical
- The legacy UUID vs BM-integer branch detection (line 48 — `Number.isInteger(...)`).
- The "both opponents required" BYE-guard at lines 67–75.
- The fallback values (`'pending'` for unknown status, default `'winners'` for unknown match_type).
- The shape returned to `setEditingMatch` (the `PlayoffMatch` literal).

### PlayoffDialogs `teamsByDivision` (covered here for atomicity)
The prop is currently `Record<string, any>`. It is consumed only to drive the team-division dialog. The right fix is to narrow to `Record<string, TeamWithDivision[]>` (or whatever the existing array shape is — check the call site in the parent page before deciding). This is a one-line change in `PlayoffDialogs.tsx:21` plus matching the parent's actual data shape. Verify with `npm run typecheck` that no other consumer breaks.

---

## E. Badge RPC result typing — implementation plan

**Re-scope:** retry parser work (originally PR 7) is already done. The only remaining piece is `BadgeProcessingService.ts`.

### What's wrong today
Every public method returns `Promise<unknown>`. The `unknown` is honest — these are RPC envelopes — but it leaks "I don't care what came back" semantics into every caller. Today nothing inspects the return value. If an RPC starts returning `{ error: '...' }` envelopes, the failure is invisible.

### Planned contracts
Live in `src/types/badges.ts` (file already exists with `BadgeRpcJsonResult`).

```ts
export interface BadgeRpcSuccess {
  ok: true;
  data: BadgeRpcJsonResult;
}

export interface BadgeRpcFailure {
  ok: false;
  error: string;
  raw?: unknown;
}

export type BadgeRpcResult = BadgeRpcSuccess | BadgeRpcFailure;
```

### What to change
Convert each method on `BadgeProcessingService` from `Promise<unknown>` to `Promise<BadgeRpcResult>`. Add an internal `wrap()` helper that turns the Supabase RPC `{ data, error }` envelope into a `BadgeRpcResult`. The wrapper preserves current behavior because today callers never inspect the result — adding richer return data doesn't break anyone.

### What MUST stay identical
- **All RPC names and parameters.** No `.rpc()` call site changes argument values.
- **The "process each badge independently" semantics** in `matchDatabaseUtils.ts:77–79` — if one badge RPC fails, others must still run. The wrapper returns a failure result instead of throwing, which matches today's "swallow and continue" behavior. Do not switch to throw.
- **The retry-queueing branch** in `matchDatabaseUtils.ts:162–168`. Today it queues on caught errors. Decide explicitly: do we also queue when `result.ok === false`? **Default: no.** Today the code only queues on thrown errors. If we change that, it's a behavior change and out of scope for this PR. Leave queueing logic alone.

---

## F. Seed mutation flow — implementation plan
**No work required.** All four files are clean. This section is intentionally short.

If a future PR wants to add cache-key constants and a typed `SeedCacheValue`, it should be filed as a Phase 4 hardening task, not bundled into Phase 3.

---

## G. Auth boundary — implementation plan

### G1. `AuthService.ts:17` — the bridge cast
This is the only **active misdirection** in the auth boundary. `toPgError` claims its return is a `PostgrestError` and constructs an object that is missing fields. The forgery works today only because `handleDatabaseError` is structurally tolerant.

**Planned fix:** stop pretending. Two options:

- **Option A (preferred):** add a tiny `handleAuthError(error: AuthError, message: string)` to `src/utils/errorHandler` and call it instead. No more bridge cast. No behavior change because the new helper produces the same thrown error class with the same message.
- **Option B:** keep the bridge but make it a real `PostgrestError`-shaped value by extending the literal to include the missing fields. Less clean than A.

PR 9 should pick A.

### G2. `useAuthMethods.ts:21` — weak-password narrowing
`data as { weakPassword?: WeakPasswordReasons }` is a one-line narrowing on the Supabase `signUp` response. The cleanest fix is a tiny type guard inline (`'weakPassword' in data ? data.weakPassword : undefined`), no SDK type imports needed.

### G3. `nativeAuth.ts:49` — Capgo response cast
This is the **right boundary** for a third-party SDK response. The right fix is to keep `response` as `unknown` and call a parser:
```ts
const parsed = parseNativeGoogleLoginResult(response); // returns NativeGoogleLoginResult | null
if (!parsed) {
  return { success: false, error: new Error('Unrecognized native login response') };
}
const idToken = extractIdToken(parsed);
```
The parser lives in `src/utils/nativeAuth.ts` alongside `extractIdToken`. Keep the existing tolerant shape that allows either nested `result.idToken` or a flat `idToken` bag.

### What MUST stay identical
- **Error message text** users see. The new `handleAuthError` must produce the same strings as `toPgError(...) -> handleDatabaseError(...)` does today.
- **The native login fallback chain** in `extractIdToken` (nested vs flat token bag).
- **The signUp weak-password surface** — the hook's `signUp` return must still expose `weakPassword`.
- **No new thrown exceptions.** `nativeAuth` already returns `{ success: false, error }`; preserve that envelope on parse failure.

---

## H. Boundary mapping strategy

For each boundary, the policy is the same: raw input is `unknown` or the library-declared shape; a parser/guard returns an app-owned domain type; failures throw at write-path boundaries and return a result envelope at side-effect boundaries.

| Boundary | Raw input | Parser/guard location | Returns | On failure |
|---|---|---|---|---|
| Edge function request body | `unknown` (already JSON-parsed) | inline `CreateBracketPayload` interface + existing imperative validation (lines 449–505) | `CreateBracketPayload` | **throw** (preserves current `400` response path) |
| Supabase query results | typed by `Database` types | services in `src/services/` | domain types | **throw** via `handleDatabaseError` |
| Supabase RPC results | `{ data, error }` envelope | RPC-specific wrappers in services | discriminated success/failure | **return failure result**, do not throw (preserve current swallow semantics for badges) |
| localStorage retry payloads | `string` | `isValidFailedBadgeOperation` (already present) | `FailedBadgeOperation` | **skip + log** (already happens) |
| React Query cache snapshots | already typed | hooks via `queryClient.getQueryData<T>(...)` | typed | none — read-only |
| Native auth SDK responses | `unknown` | new `parseNativeGoogleLoginResult` | `NativeGoogleLoginResult \| null` | **return null + caller surfaces "unrecognized"** |
| brackets-manager DTOs | library-typed | adapter (`SupabaseSqlStorage` + viewer adapter) | library types | adapter throws |
| Legacy playoff DB rows | typed by `Database` types | `BracketMatchReadService` (already done) | `LegacyPlayoffMatchWithGames` | **throw** via `ensureFound`/`handleDatabaseError` |

---

## I. Recommended small-diff implementation sequence

PRs are sized so each is independently reviewable and rollback-safe.

### Step 1 — PR 2: Create-bracket generator DTO typing
- **Files:** `supabase/functions/create-bracket/index.ts` + new `supabase/functions/create-bracket/types.ts`.
- **Casts removed:** 4 (lines 95, 164, 202, 653).
- **Behavior:** unchanged.
- **Risk:** medium-high. The risk is mostly *review* risk — reviewers must verify nullable fields stay nullable.
- **Verification:** `npm run typecheck`, `npm run lint`. **No local Deno** — edge function type-checking happens via Supabase CLI or CI workflow. Confirm in PR which workflow validates edge functions.
- **Smoke tests:** single-elim 8 teams, single-elim 5 teams (forces byes), double-elim 8 teams. Inspect persisted match graph in Supabase.
- **Rollback:** revert PR.

### Step 2 — PR 3: Create-bracket insert payload typing
- **Files:** `supabase/functions/create-bracket/index.ts` (and adds insert payload types to the same `types.ts` from PR 2).
- **Casts removed:** zero (these aren't casts today, just structurally-typed inserts). The win is **compile-time enforcement that generator output matches table shape.**
- **Behavior:** unchanged.
- **Risk:** medium. Field-rename drift across PR 2/3 is the main hazard.
- **Verification:** same as PR 2.
- **Smoke tests:** same as PR 2.
- **Rollback:** revert PR.

### Step 3 — PR 4b: usePlayoffEditMatch hook cast removal
- **Files:** `src/hooks/playoffs/usePlayoffEditMatch.ts`, plus tiny guard helpers in `src/services/brackets/read/`.
- **Casts removed:** 3 (lines 95, 169, 185, 191 — last two share a single guard pair).
- **Behavior:** unchanged. Fallback values preserved (`'pending'` for status, `'winners'` for match_type).
- **Risk:** medium. Both UUID and BM-integer paths must keep working; pay attention to BYE-guard.
- **Verification:** `npm run typecheck`, `npm run lint`, `npm run test:file -- src/hooks/playoffs/usePlayoffEditMatch.ts` if any tests cover this hook.
- **Smoke tests:** open a legacy UUID match for edit; open a BM-integer match for edit; save scores in both.
- **Rollback:** revert PR.

### Step 4 — PR 5b: PlayoffDialogs teamsByDivision narrowing
- **Files:** `src/components/playoffs/dialogs/PlayoffDialogs.tsx` and its parent page (one line).
- **Casts removed:** 1 (`Record<string, any>` → real type).
- **Behavior:** unchanged.
- **Risk:** low. Compiler will flag callers that pass a different shape.
- **Verification:** `npm run typecheck`.
- **Smoke tests:** open team-division dialog.
- **Rollback:** revert PR.

### Step 5 — PR 6: Badge RPC result typing
- **Files:** `src/services/BadgeProcessingService.ts`, `src/types/badges.ts`.
- **Casts removed:** zero (today's pattern is `Promise<unknown>`, not casts). The win is **eleven Promise<unknown> returns become typed success/failure unions**.
- **Behavior:** unchanged. Specifically: today nothing inspects RPC returns; after PR 6, nothing **mandatorily** inspects them either. The retry queue continues to trigger only on thrown errors.
- **Risk:** medium-low. Risk is a future call site assuming `ok === true` and crashing if not — prevent by leaving callers as-is in this PR.
- **Verification:** `npm run typecheck`, `npm run lint`, `npm test` (focused if any badge tests exist).
- **Smoke tests:** complete a match → confirm badges process; verify match completion still triggers same number of RPC calls.
- **Rollback:** revert PR.

### Step 6 — PR 9: Auth boundary typing
- **Files:** `src/services/auth/AuthService.ts`, `src/utils/errorHandler.ts` (small addition), `src/utils/nativeAuth.ts`, `src/hooks/auth/useAuthMethods.ts`.
- **Casts removed:** 3 (`AuthService.ts:17`, `nativeAuth.ts:49`, `useAuthMethods.ts:21`).
- **Behavior:** unchanged. Error message strings preserved.
- **Risk:** medium. Auth failures are user-facing; wrong string mapping is visible.
- **Verification:** `npm run typecheck`, `npm run lint`.
- **Smoke tests:** web login (success + wrong password); web signup (success + weak-password warning); native login if a device/emulator is available; sign out.
- **Rollback:** revert PR.

### Step 7 — PR 10: Third-party containment (brackets-viewer)
- **Files:** `src/types/brackets-viewer.d.ts`, possibly a new tiny `src/types/brackets-viewer-adapter.ts` containment helper.
- **Casts removed:** the eight `any`/`any[]` fields move from a global declaration to a containment helper that the *one* call site uses. The rest of the app type-imports the safer shape.
- **Behavior:** unchanged. The viewer keeps rendering the same data.
- **Risk:** low-medium. This is the last PR for a reason — it depends on no app code still inlining `BracketsViewerData`-shaped values without going through the containment helper.
- **Verification:** `npm run typecheck`, `npm run lint`, `npm run build`.
- **Smoke tests:** open a playoff bracket page; verify the viewer renders single-elim and double-elim brackets correctly; click a match (calls `onMatchClick`); confirm "ready", "completed", and BYE matches all render.
- **Rollback:** revert PR.

---

## J. Ranked Phase 3 findings — current state

Ordering reflects **what's left**, not what existed when the plan was first written. Priority = Blast Radius + Runtime Risk + Ease of Replacement.

| Rank | Cluster | Files | Pattern | Bucket | Blast | Risk | Ease | Score | Why this matters | Fix |
|---:|---|---|---|---|---:|---:|---:|---:|---|---|
| 1 | Create-bracket generation | `supabase/functions/create-bracket/index.ts:95,164,202,653` | `any[]`, `team1/team2: any`, `bracketResult: any` | Bracket graph generation any | 5 | 5 | 3 | **13** | Persists malformed match graph if drift occurs | PR 2 |
| 2 | Create-bracket insert payloads | same file, lines 608/637/669 | structural insert objects | Persisted write-path any | 5 | 4 | 3 | **12** | Generator drift not caught at compile time | PR 3 |
| 3 | Badge RPC envelope opacity | `BadgeProcessingService.ts:6–199` | `Promise<unknown>` × 11 | Badge RPC/result any | 4 | 5 | 4 | **13** | Failed RPCs invisible to callers | PR 6 |
| 4 | Auth bridge cast | `AuthService.ts:17` | `as unknown as PostgrestError` | Auth SDK boundary any | 3 | 4 | 5 | **12** | Wrong error shape leaks into shared pipeline | PR 9 |
| 5 | usePlayoffEditMatch casts | `usePlayoffEditMatch.ts:95,169,185,191` | `as PlayoffBracket`, `as <literal-union>` | Match score/update any | 4 | 3 | 4 | **11** | Score editor receives wrong shape if DB drifts | PR 4b |
| 6 | brackets-viewer global `any[]` | `brackets-viewer.d.ts:12–17,32–33` | `any[]` × 6, `any` × 2 | Third-party containment any | 3 | 2 | 4 | **9** | App-wide weak typing of viewer data | PR 10 |
| 7 | Native SDK response cast | `nativeAuth.ts:49` | `response as NativeGoogleLoginResult` | Auth SDK boundary any | 2 | 3 | 4 | **9** | Token extraction could break quietly | PR 9 |
| 8 | Weak-password extraction | `useAuthMethods.ts:21` | `data as { weakPassword?: ... }` | Auth SDK boundary any | 2 | 2 | 5 | **9** | Misses signup hint if Supabase response shape drifts | PR 9 |
| 9 | PlayoffDialogs teamsByDivision | `PlayoffDialogs.tsx:21` | `Record<string, any>` | Low-value local any | 2 | 2 | 5 | **9** | Weak prop bag; small blast radius | PR 5b |

Rows from the original ranked table that no longer apply have been removed (badge retry parser, seed service cast, optimistic rollback state — all already typed).

---

## K. Regression risks (explicit)

Per-PR risks are listed in section O. Cross-cutting risks to watch:

- **Bracket creation writes malformed match graph.** Mitigation: PR 2/3 are type-only and never touch the generator algorithm. Reviewers must verify nullable fields stay nullable.
- **Double-elimination loser feed breaks.** Mitigation: `match_type` literal union must include `'losers'` and `'finals'`. Smoke-test a double-elim bracket.
- **BYE handling changes accidentally.** Mitigation: `team1_id`/`team2_id`/`team1_seed`/`team2_seed` remain nullable. Smoke-test a 5-team single-elim bracket.
- **Playoff match score saves but badge side effects fail silently.** Risk **decreases** with PR 6 because the return becomes inspectable. We still don't change the swallow-and-continue behavior.
- **Failed badge retries replay wrong payloads.** PR 7 is already shipped; nothing in Phase 3 touches it.
- **Old retry queue payloads crash parsing.** Same — PR 7 done; quarantine path is in place.
- **Optimistic seed update displays success but rollback wrong.** Phase 3 doesn't touch seed mutations; behavior is preserved.
- **Legacy UUID playoff match edit breaks.** PR 4b risk. Mitigation: keep `Number.isInteger(...)` branch detection unchanged; smoke-test legacy match.
- **BM-integer match edit breaks.** Same — keep the BM branch intact; smoke-test.
- **Match status/result mapping narrows incorrectly.** Mitigation: status/match-type guards in PR 4b preserve current `|| 'pending'` and `|| 'winners'` fallbacks.
- **Native login token extraction breaks.** Mitigation: PR 9 keeps `extractIdToken` tolerant of both nested and flat token bags.
- **Weak-password details disappear.** Mitigation: keep the `weakPassword` field surfaced on `signUp` return.
- **Auth errors swallowed or mislabeled.** Mitigation: new `handleAuthError` must produce identical message text to current `toPgError + handleDatabaseError`.
- **Brackets viewer rendering changes.** Mitigation: PR 10 is last; only changes type declaration, not viewer call site.

---

## L. Verification plan

### Scripts actually available (verified in `package.json`)
- `npm run dev`
- `npm run build`
- `npm run build:dev`
- `npm run lint`
- `npm run lint:fix`
- `npm run preview`
- `npm test`
- `npm run test:watch`
- `npm run typecheck` (= `tsc --noEmit`)
- `npm run test:coverage` and variants

### Tools NOT available locally
- **`deno` is not installed in this repo or its CI image.** Edge function type-checking happens through the Supabase CLI workflow (if configured) or via GitHub Actions. Do not assume `deno check supabase/functions/create-bracket/index.ts` works on a contributor's machine.

### Minimum verification matrix for each Phase 3 PR
1. `npm run typecheck`
2. `npm run lint`
3. Focused tests via `npm run test:file -- <path>` when present
4. `npm run build` for PR 10 (third-party containment touches type declarations consumed across the app)
5. For PR 2 / PR 3: rely on the Supabase edge-function CI workflow to validate Deno-side types

### Manual smoke tests (required for write-path PRs)
- Create a single-elim bracket (8 teams).
- Create a single-elim bracket with byes (5–7 teams).
- Create a double-elim bracket (8 teams).
- Confirm BYE matches present with null team IDs.
- Confirm loser bracket feeds reference correct winners-bracket sources.
- Confirm grand finals R1 and R2 (reset match) both inserted.
- Edit a legacy UUID playoff match score.
- Edit a brackets-manager (integer) match score.
- Complete a match → confirm badge RPCs fire (network panel) → confirm UI updates.
- Open team-division dialog → confirm display unchanged.
- Web login (success + wrong password).
- Web signup (success + weak-password warning).
- Native login if device/emulator available.
- Bracket viewer renders single-elim, double-elim, and a match with BYEs.
- Click a match in the viewer → handler fires with correct ID.

---

## M. Safe-to-ignore / contain (Phase 3 scope)

These can stay as they are. Document but do not aggressively fix.

1. **`SupabaseSqlStorage.ts:39` — `p as DataTypes['participant'] & { position?: number }`.** Canonical "library DTO with an app-specific optional field" pattern. Acceptable. Leave it; no helper extraction needed.
2. **`as const` literal narrowings throughout `matchDatabaseUtils.ts` and `usePlayoffMatchUpdate.ts`.** These are tightening, not loosening — they are *safer* than not having them.
3. **Storybook shims.** Out of scope.
4. **Icon registry broad component typing.** Out of scope.
5. **Recharts payload casts (already contained by Phase 2).** Do not revisit.
6. **Test-only `any` outside the business-critical flows.** Out of scope.
7. **`usePlayoffEditMatch.ts:272 — error as Error` in catch.** Defensive narrowing; behavior change to replace.

For each: document in PR comment, do not refactor.

---

## N. Non-goals

- No source implementation outside the explicit PR scopes above.
- No strict mode enablement.
- No broad eslint unsafe-any rollout.
- No database migrations, schema changes, or RLS changes.
- No bracket algorithm rewrite, loser-feed change, BYE behavior change, grand-finals reset change.
- No badge award logic change.
- No badge retry parser rework (already done).
- No seed mutation behavior change (already typed).
- No optimistic rollback rewrite (already typed).
- No auth behavior change.
- No mass UI cleanup.
- No third-party type purity campaign.

---

## O. Final Phase 3 roadmap

### 1) Top remaining Phase 3 targets (descending priority on current state)
1. `supabase/functions/create-bracket/index.ts` — generator `any` removal (PR 2).
2. `src/services/BadgeProcessingService.ts` — typed RPC result unions (PR 6).
3. `supabase/functions/create-bracket/index.ts` — typed insert payloads (PR 3).
4. `src/services/auth/AuthService.ts` + auth boundary trio (PR 9).
5. `src/hooks/playoffs/usePlayoffEditMatch.ts` — hook cast removal (PR 4b).
6. `src/types/brackets-viewer.d.ts` — third-party containment (PR 10).
7. `src/components/playoffs/dialogs/PlayoffDialogs.tsx` — `teamsByDivision` narrowing (PR 5b).

Rows 8–10 from the original Top 10 have been retired: badge retry parser, seed service, optimistic rollback — all already clean.

### 2) Top 5 safest quick wins
1. PR 5b — `teamsByDivision` narrowing (one line + one parent file).
2. PR 9 G2 — `weakPassword` narrowing in `useAuthMethods.ts:21` (one inline guard).
3. PR 9 G1 — replace `toPgError` bridge with a proper `handleAuthError` helper.
4. PR 4b status/match-type guards.
5. PR 6 wrapping `Promise<unknown>` → `BadgeRpcResult` without changing call sites.

### 3) Top 5 dangerous areas
1. Create-bracket generator algorithm — touching generator code while ostensibly only typing it is the #1 way to break Phase 3.
2. Double-elim loser-feed wiring — `match_type` union must include `'losers'` and `'finals'`.
3. Badge retry / processing partial-failure semantics — must preserve "process each badge independently, swallow individual errors."
4. Legacy UUID vs BM-integer branch detection in `usePlayoffEditMatch.ts` — a wrong narrowing on `matchId` parsing breaks one of the two edit paths.
5. Auth error message text — users see these strings; the new helper must produce identical output.

### 4) Suggested implementation order — 1 week
- Day 1: PR 5b (teamsByDivision) + PR 9 G2 (weakPassword). Two tiny low-risk PRs to warm up.
- Day 2: PR 9 G1 + G3 (auth bridge + native parser).
- Day 3: PR 4b (usePlayoffEditMatch casts).
- Day 4: PR 6 (badge RPC result typing).
- Day 5: PR 2 (create-bracket generator DTOs) — biggest one, allow a full day.

### 5) Suggested implementation order — 2 weeks
- Week 1 above.
- Week 2:
  - Day 6: PR 3 (create-bracket insert payloads).
  - Day 7: PR 10 (brackets-viewer containment).
  - Days 8–10: review backlog, regression smoke tests, document any deferred items as Phase 4 candidates.

### 6) Prerequisites from Phase 1/2 that must be complete before implementation
- Phase 1 read-model types (`LegacyPlayoffMatchWithGames`, `BracketManagerMatchWithStage`, `BracketMatchReadService` typed returns) — **done.**
- Phase 2 shared abstractions (`TeamSeedUpdateInput/Result`, `BulkTeamSeedUpdateResult`, badge retry discriminated union, recharts containment, error utilities) — **done.**
- `handleDatabaseError` and `ensureFound` utilities — **stable.**
- `src/types/phase3.ts` re-export hub from PR 1 — **in place.**

---

## P. Safe PR breakdown for Phase 3 implementation (current state)

Rules: one purpose per PR; independently reviewable; independently rollback-safe; no mixing of type-contract work with behavior changes; no DB/RLS changes.

### PR 2 — Create-bracket generator DTO typing
- **Status:** outstanding.
- **Files:** `supabase/functions/create-bracket/index.ts`; new `supabase/functions/create-bracket/types.ts`.
- **Casts removed:** lines 95, 164, 202, 653.
- **Contracts introduced:** `BracketFormat`, `SeedTeam`, `SeedingPair`, `GeneratedMatchType`, `GeneratedMatchStatus`, `GeneratedBracketMatch`, `SingleElimGenerationResult`, `DoubleElimGenerationResult`, `GeneratedBracketResult`.
- **Behavior changes:** none.
- **Why safe:** algorithm untouched; emitted match objects field-for-field identical; nullable fields preserved.
- **Regression risks:** see §K row 1–3.
- **Verification:** `npm run typecheck`, `npm run lint`, Supabase edge-function CI workflow.
- **Smoke tests:** single-elim, single-elim with byes, double-elim.
- **Rollback:** revert.
- **Risk:** Medium-High. **Value:** High. **Independent:** Yes. **Depends on:** PR 1 (done).

### PR 3 — Create-bracket insert payload typing
- **Status:** outstanding. Depends on PR 2.
- **Files:** `supabase/functions/create-bracket/index.ts`; extends `supabase/functions/create-bracket/types.ts`.
- **Contracts introduced:** `BracketInsertPayload`, `ParticipantInsertPayload`, `PlayoffMatchInsertPayload`.
- **Behavior changes:** none.
- **Why safe:** column lists unchanged; values unchanged.
- **Regression risks:** field-rename drift between PR 2 and PR 3.
- **Verification:** `npm run typecheck`, edge-fn CI.
- **Smoke tests:** persisted match graph integrity after bracket creation.
- **Rollback:** revert.
- **Risk:** Medium. **Value:** High. **Independent:** No (depends on PR 2).

### PR 4b — usePlayoffEditMatch hook cast removal
- **Status:** outstanding (small remainder of original PR 4).
- **Files:** `src/hooks/playoffs/usePlayoffEditMatch.ts`; small guard helpers in `src/services/brackets/read/`.
- **Casts removed:** lines 95, 169, 185, 191.
- **Contracts introduced:** `parseMatchType`, `parseLegacyMatchStatus`, `buildEditorBracketForMatch`.
- **Behavior changes:** none. Fallbacks preserved.
- **Why safe:** wraps existing inline expressions; legacy/BM branch detection untouched.
- **Regression risks:** see §K legacy/BM edit rows.
- **Verification:** `npm run typecheck`, `npm run lint`, focused hook test.
- **Smoke tests:** edit a legacy match; edit a BM match.
- **Rollback:** revert.
- **Risk:** Medium. **Value:** Medium. **Independent:** Yes. **Depends on:** PR 1 (done).

### PR 5b — PlayoffDialogs `teamsByDivision` narrowing
- **Status:** outstanding (small remainder of original PR 5).
- **Files:** `src/components/playoffs/dialogs/PlayoffDialogs.tsx` + parent page.
- **Casts removed:** line 21 `Record<string, any>`.
- **Behavior changes:** none.
- **Why safe:** TypeScript catches every consumer that passes the wrong shape.
- **Verification:** `npm run typecheck`.
- **Smoke tests:** team-division dialog open/close.
- **Rollback:** revert.
- **Risk:** Low. **Value:** Low-Medium. **Independent:** Yes.

### PR 6 — Badge RPC result typing
- **Status:** outstanding.
- **Files:** `src/services/BadgeProcessingService.ts`, `src/types/badges.ts`.
- **Contracts introduced:** `BadgeRpcSuccess`, `BadgeRpcFailure`, `BadgeRpcResult`, internal `wrapRpc` helper.
- **Behavior changes:** none. Callers do not start to inspect results in this PR.
- **Why safe:** swallow-and-continue semantics preserved; retry queueing unchanged.
- **Regression risks:** see §K badge side-effect rows.
- **Verification:** `npm run typecheck`, `npm run lint`, focused badge tests if present.
- **Smoke tests:** complete a match; verify badge RPCs fire and UI updates.
- **Rollback:** revert.
- **Risk:** Medium. **Value:** High. **Independent:** Yes.

### PR 9 — Auth/native SDK boundary typing
- **Status:** outstanding.
- **Files:** `src/services/auth/AuthService.ts`, `src/utils/errorHandler.ts` (new helper), `src/utils/nativeAuth.ts`, `src/hooks/auth/useAuthMethods.ts`.
- **Casts removed:** `AuthService.ts:17`, `nativeAuth.ts:49`, `useAuthMethods.ts:21`.
- **Contracts introduced:** `handleAuthError` helper; `parseNativeGoogleLoginResult` guard.
- **Behavior changes:** none. Error message text preserved by behavioral test of `handleAuthError` against `toPgError + handleDatabaseError`.
- **Regression risks:** see §K auth rows.
- **Verification:** `npm run typecheck`, `npm run lint`.
- **Smoke tests:** web login success + fail; web signup success + weak-password; native login if available; sign out.
- **Rollback:** revert.
- **Risk:** Medium. **Value:** Medium-High. **Independent:** Yes.

### PR 10 — Third-party brackets-viewer containment
- **Status:** outstanding. Last in sequence.
- **Files:** `src/types/brackets-viewer.d.ts`; possibly a small adapter helper file.
- **Casts removed/contained:** `any[]` × 6 and `any` × 2 in the global declaration.
- **Contracts introduced:** containment helper exposing safer shapes to the rest of the app.
- **Behavior changes:** none.
- **Why safe:** viewer call site unchanged; only the type declaration narrows.
- **Regression risks:** see §K viewer row.
- **Verification:** `npm run typecheck`, `npm run lint`, `npm run build`.
- **Smoke tests:** open playoff bracket; render single-elim, double-elim, BYE; click match.
- **Rollback:** revert.
- **Risk:** Low-Medium. **Value:** Medium. **Independent:** Yes.

### PR ordering with risk / value / dependency

| PR | Risk | Value | Review focus | Independent? | Depends on |
|---:|---|---|---|---|---|
| 5b | Low | Low-Medium | Prop callers match new shape | Yes | — |
| 9 | Medium | Medium-High | Error message parity | Yes | — |
| 4b | Medium | Medium | Legacy vs BM branch parity, fallbacks | Yes | — |
| 6 | Medium | High | Swallow-and-continue semantics | Yes | — |
| 2 | Medium-High | High | Nullable preservation, literal unions | Yes | — |
| 3 | Medium | High | Field parity with PR 2 | No | PR 2 |
| 10 | Low-Medium | Medium | Viewer render parity | Yes | (does not block others) |

**Recommended landing order:** 5b → 9 → 4b → 6 → 2 → 3 → 10. Two trivial PRs first to validate the verification pipeline; the riskier edge function changes ride on a warmed-up review process.

**The safest implementation approach is small PRs in this order, not one large unsafe typing sweep.**

---

## Q. Behavior preservation playbook (per PR)

Concrete invariants reviewers must check before merging each PR.

### PR 2 — Generator typing
- [ ] `team1_id`, `team2_id`, `team1_seed`, `team2_seed`, `next_win_match_id`, `next_lose_match_id` remain `... | null`.
- [ ] `match_type` literal union is exactly `'winners' | 'losers' | 'finals'` — no additions, no removals.
- [ ] `best_of` stays `number`.
- [ ] `status` is `'pending'` at generation time.
- [ ] No new logic branches added — only annotations.
- [ ] Manual diff of the emitted `matches` array vs pre-PR for a single-elim 8-team run shows zero differences.

### PR 3 — Insert payloads
- [ ] Insert payload type fields match `playoff_matches` columns exactly (no rename, no addition, no drop).
- [ ] `participantRecords` shape matches `participants` table.
- [ ] `brackets` insert column list (line 617 select) unchanged.
- [ ] No `select('*')` introduced.

### PR 4b — Hook cast removal
- [ ] `Number.isInteger(...)` branch (line 48) unchanged.
- [ ] BYE-guard `if (!opponent1_id || !opponent2_id)` (lines 67–75) unchanged.
- [ ] Status fallback `|| 'pending'` preserved.
- [ ] Match-type fallback `|| 'winners'` preserved.
- [ ] `setEditingMatch(...)` argument shape unchanged.

### PR 5b — teamsByDivision
- [ ] Dialog open/close behavior unchanged.
- [ ] Parent page passes the new shape (compiler-enforced).

### PR 6 — Badge RPC envelope
- [ ] `matchDatabaseUtils.ts` does NOT change call sites to inspect `result.ok` (out of scope).
- [ ] Retry queueing branch unchanged.
- [ ] Each individual badge RPC continues to run independently of others.

### PR 9 — Auth boundary
- [ ] `handleAuthError` produces identical thrown-error class and message text as today's `toPgError → handleDatabaseError` chain (verify by unit comparison in PR description).
- [ ] `extractIdToken` still accepts nested `result.idToken` and flat `idToken`.
- [ ] `signUp` return still exposes `weakPassword`.
- [ ] `nativeAuth` returns `{ success: false, error }` on parse failure (same envelope as today).

### PR 10 — Viewer containment
- [ ] Viewer `render()` call site unchanged.
- [ ] `setParticipantImages` call site unchanged.
- [ ] `onMatchClick` receives the same shape it does today.
- [ ] `customRoundName` receives the same shape it does today.

---

**Ready for implementation only after this Phase 3 plan and PR breakdown are reviewed.**

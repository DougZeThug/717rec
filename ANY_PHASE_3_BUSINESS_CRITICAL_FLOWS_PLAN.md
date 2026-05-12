# ANY Phase 3 — Business-Critical Flows Plan

## A. Executive summary

### What Phase 3 is fixing
Phase 3 is focused on unsafe typing in **business-critical write and side-effect paths** where bad types can cause real production damage:
- Persisting malformed bracket graphs.
- Saving incorrect match completion state.
- Hiding failed badge operations behind weak result typing.
- Showing successful optimistic seed updates while rollback is incorrect.
- Mishandling auth/native login boundary results and error metadata.

### What Phase 3 is explicitly not fixing
- Not a broad app-wide `any` cleanup.
- No TypeScript strict mode enablement.
- No broad eslint unsafe-any enforcement rollout.
- No DB schema, migration, or RLS policy changes.
- No bracket algorithm rewrite.
- No loser bracket feed or BYE behavior changes.
- No badge rules changes.
- No auth behavior changes.

### Why business-critical flows come after shared contracts
Phase 1 and Phase 2 established higher-level shared types and read-model contract improvements. Phase 3 now uses those foundations to tighten **write-path truth** and **boundary parsing** where compiler silence can mask runtime corruption.

### Which flows can corrupt data
- Create-bracket edge function generation + insert payloads.
- Match score completion update payloads and status/result mapping.
- Seed mutation batch writes with optimistic cache desync risk.

### Which flows can hide failed operations
- Badge RPC calls returning weakly-typed results.
- Retry queue payload parsing that accepts malformed historic payloads too loosely.
- Auth error/result boundaries that flatten useful provider-specific details.

### Expected risk level
**High risk if done carelessly.** This phase must be executed as small, isolated, rollback-safe PRs.

---

## A.1 Implementation status snapshot (2026-05-12 verification)

This section tracks the actual state of each Phase 3 PR on branch
`claude/plan-phase-3-any-remediation-UNsfh` so future sessions stop assuming PRs
are merged when they are not.

| PR | Title | Status | Evidence |
|---:|---|---|---|
| 1 | Phase 3 prerequisites / contract alignment | ✅ Merged | Commit `8c3a5e4` ("chore: align phase 3 critical flow type contracts"), merged via PR #609. Added `src/types/phase3.ts` re-export hub. |
| 2 | Create-bracket generator DTO typing | ❌ Outstanding | `supabase/functions/create-bracket/index.ts` still contains all four planned `any` sites — lines 95, 164, 202, 653. No commits touching this file since the initial import (`9243b81`). |
| 3 | Create-bracket insert payload typing | ⏳ Not started | Depends on PR 2. |
| 4 | Match edit read-model typing | ⏳ Not started | — |
| 5 | Match score update input/result contracts | ⏳ Not started | — |
| 6 | Badge RPC result typing | ⏳ Not started | — |
| 7 | Badge retry queue typing + parser | ⏳ Not started | — |
| 8 | Seed mutation rollback/cache typing | ⏳ Not started | — |
| 9 | Auth/native SDK boundary typing | ⏳ Not started | — |
| 10 | Third-party containment cleanup | ⏳ Not started | — |

### Plain-English: where things stand
- The plan exists. The prereq alignment shim exists.
- The **first real write-path PR (PR 2) has not landed.** The four documented `any`
  sites are still in the edge function, untouched.
- Until PR 2 lands, PR 3 (typed insert payloads) is blocked, because PR 3 builds
  on the generator DTO shapes PR 2 is supposed to introduce.

### Why this matters
Skipping PR 2 leaves the highest-priority cluster from §J row 1 (`Priority Score
13`) and row 2 (`Priority Score 14`) un-typed. These are the two clusters with
the explicit "can persist malformed tournament graph" failure mode. The PR 1
shim does not address them — it only re-exports already-existing app-side types
and the edge function does not import that shim.

---

## B. Current findings by target area

## B1) Create-bracket edge function
**File inspected:** `supabase/functions/create-bracket/index.ts`

### Unsafe patterns found
- `const matches: any[] = [];` (single elimination generation)
- `const pairs: Array<{ team1: any; team2: any }> = [];` (seeding pairs)
- `const matches: any[] = [];` (double elimination generation)
- `let bracketResult: any = null;`

### Representative snippets
- `const matches: any[] = [];`
- `const pairs: Array<{ team1: any; team2: any }> = [];`
- `let bracketResult: any = null;`

### Classification
- Upstream vs downstream: **Upstream**
- Touches write path: **Yes**
- Touches persisted data: **Yes** (`brackets`, `participants`, `playoff_matches`)
- Touches brackets-manager behavior: **Indirectly** (it creates graph consumed later by manager/viewers)
- Real truth vs compiler silence: **Compiler silence**

---

## B2) Match score update / edit flow
**Files inspected:**
- `src/hooks/playoffs/usePlayoffEditMatch.ts`
- `src/services/brackets/read/BracketMatchReadService.ts`
- `src/components/playoffs/match-score-editor/MatchScoreEditor/types.ts`
- `src/components/playoffs/dialogs/PlayoffDialogs.tsx`
- `src/hooks/matches/utils/matchDatabaseUtils.ts`

### Unsafe patterns found
- `teamsByDivision: Record<string, any>` in `PlayoffDialogs`.
- Status/type conversions via casts in `usePlayoffEditMatch`:
  - `matchData.match_type as PlayoffMatch['matchType']`
  - `status: (matchData.status as 'pending' | 'in_progress' | 'completed') || 'pending'`
  - `setCurrentBracket(... as PlayoffBracket)`
- Legacy UUID path and BM integer path merged in one hook; type truth split is implicit, not explicit.

### Representative snippets
- `teamsByDivision: Record<string, any>;`
- `matchType: matchData.match_type as PlayoffMatch['matchType'],`
- `status: (matchData.status as 'pending' | 'in_progress' | 'completed') || 'pending',`

### Classification
- Upstream vs downstream: **Mixed** (read-service + hook mapping)
- Touches write path: **Yes** (edit/save flow)
- Touches persisted data: **Yes** (score update flow)
- Touches brackets-manager behavior: **Yes** (integer BM path mapping)
- Real truth vs compiler silence: **Mostly compiler silence at mapping points**

---

## B3) Badge processing and retry path
**Files inspected:**
- `src/services/BadgeProcessingService.ts`
- `src/services/FailedBadgeOperationsService.ts`
- `src/hooks/matches/utils/matchDatabaseUtils.ts`

### Unsafe patterns found
- Badge RPC methods mostly typed as `Promise<unknown>`.
- Retry storage parser validates operation envelope but operation-specific `params` are only checked as generic object.
- Retry replay path relies on discriminant switch (good), but old malformed payloads can still slip through weak param checks.

### Representative snippets
- `static async processMatchBadges(...): Promise<unknown>`
- `typeof op.params === 'object' && op.params !== null`

### Classification
- Upstream vs downstream: **Upstream at RPC/storage boundaries**
- Touches write path: **Side-effect path after write**
- Touches persisted data: **Indirectly** (badge tables/RPC effects)
- Touches brackets-manager behavior: **No**
- Real truth vs compiler silence: **Compiler silence for RPC payload/result contracts**

---

## B4) Seed mutation confirmation / rollback
**Files inspected:**
- `src/services/teams/TeamSeedService.ts`
- `src/services/brackets/BracketWriteService.ts`
- `src/components/playoffs/form/bracket-teams/hooks/useOptimisticTeamMutations.ts`
- `src/components/playoffs/form/bracket-teams/hooks/useTeamSeedMutation.ts`

### Unsafe patterns found
- Cast after single-team seed update:
  - `return data as TeamSeedUpdateResult;`
- Rollback state uses mutable `Map` with timing sensitivity and `error as Error` casts.
- Batch parser only strongly checks `ok`; leaves wider payload trust ambiguous.

### Representative snippets
- `return data as TeamSeedUpdateResult;`
- `setOptimisticState((prev) => ({ ...prev, lastError: error as Error }));`

### Classification
- Upstream vs downstream: **Mixed**
- Touches write path: **Yes**
- Touches persisted data: **Yes**
- Touches brackets-manager behavior: **No direct manager dependency**
- Real truth vs compiler silence: **Compiler silence at service return + optimistic error typing**

---

## B5) Auth / native login boundary
**Files inspected:**
- `src/utils/nativeAuth.ts`
- `src/hooks/auth/useAuthMethods.ts`
- `src/services/auth/AuthService.ts`

### Unsafe patterns found
- Double-cast bridge:
  - `}) as unknown as PostgrestError;`
- Native plugin response cast:
  - `extractIdToken(response as NativeGoogleLoginResult);`
- Weak password extraction cast in hook:
  - `const withWeakPassword = data as { weakPassword?: WeakPasswordReasons };`

### Representative snippets
- `as unknown as PostgrestError`
- `response as NativeGoogleLoginResult`

### Classification
- Upstream vs downstream: **Upstream boundary parsing + downstream hook extraction**
- Touches write path: **No DB write path, but auth/session behavior**
- Touches persisted data: **Indirectly via session/auth flows**
- Touches brackets-manager behavior: **No**
- Real truth vs compiler silence: **Compiler silence**

---

## C. Create-bracket edge function analysis

Primary unsafe spots confirmed in `supabase/functions/create-bracket/index.ts`:
- `matches: any[]`
- `{ team1: any; team2: any }`
- `let bracketResult: any`
- Format-specific result ambiguity
- Weak generated match object shape
- Weak seeding pair object shape
- Weak next-match wiring contracts
- Weak insert payload contracts

### Planned contracts (no implementation yet)

1. `BracketFormat`
- **Location:** `supabase/functions/create-bracket/index.ts` (or local `types.ts`)
- **Kind:** Generation input contract
- **Removes:** implicit string branches and `any` branch result ambiguity
- **Must not change:** accepted formats or branching behavior

2. `GeneratedBracketMatch`
- **Location:** same edge function scope
- **Kind:** Generation-internal match base shape
- **Removes:** `matches: any[]`
- **Must not change:** match fields or generated values

3. `GeneratedSingleEliminationMatch`
4. `GeneratedDoubleEliminationMatch`
5. `GeneratedRoundRobinMatch` (planning placeholder only)
- **Location:** edge function
- **Kind:** Format-specific generation-internal match variants
- **Removes:** format ambiguity under one `any[]`
- **Must not change:** output structure currently inserted

6. `SeedingPair`
- **Location:** edge function
- **Kind:** generation-internal pairing shape (`team1` / `team2` nullable)
- **Removes:** `{ team1: any; team2: any }`
- **Must not change:** BYE representation (`null` team)

7. `GeneratedBracketResult`
8. `SingleElimGenerationResult`
9. `DoubleElimGenerationResult`
10. `RoundRobinGenerationResult` (placeholder)
- **Location:** edge function
- **Kind:** generation result union
- **Removes:** `let bracketResult: any`
- **Must not change:** algorithm, rounds, mapping IDs

11. `BracketInsertPayload`
12. `PlayoffMatchInsertPayload`
- **Location:** edge function (or shared supabase edge function types)
- **Kind:** DB insert/update payload contracts
- **Removes:** post-generation insert trust on loose object shape
- **Must not change:** inserted columns and values

---

## D. Match score update / edit flow analysis

### Required domain split (explicit)
1. **Read service** reads raw DB/BM rows.
2. **Read service mapper** converts raw to editor-safe domain shape.
3. **Hook** picks legacy UUID path vs BM integer path only.
4. **UI/editor** receives only editor-safe typed shape.

### Planned contracts
- `LegacyPlayoffMatchWithGames` (verify/extend existing)
- `BracketManagerEditableMatch`
- `EditablePlayoffMatchData`
- `PlayoffGameRow`
- `MatchScoreUpdateInput`
- `MatchScoreUpdateResult`
- `CompletedMatchResult`
- `AsyncVoidCallback` (already present; reuse)

### Key issues to fix (planning)
- Remove score editor and dialog reliance on ad hoc `games` object literals.
- Remove status/match-type casts in hook by making mapper return exact domain shape.
- Keep both legacy UUID and BM integer paths intact with explicit union discriminator.

---

## E. Badge processing / retry path analysis

### Issues to address
- RPC responses currently mostly `unknown` without result contracts.
- Retry params validation is too shallow for old malformed payloads.
- Replay behavior currently safe-ish but not robustly typed per operation.

### Planned contracts
- `BadgeOperationKind`
- `BadgeOperationParams`
- `BadgeOperation`
- `FailedBadgeOperation`
- `BadgeRpcSuccess`
- `BadgeRpcFailure`
- `BadgeRpcResult`
- `BadgeRetryStoragePayload`
- `BadgeRetryParseResult`

### Parsing rule
- Use `unknown` only at raw storage/RPC boundary.
- Immediately narrow with guards.
- Use discriminated unions by operation type.
- Quarantine malformed payloads; do not crash retry worker; do not silently drop valid items.

---

## F. Seed mutation confirmation / rollback analysis

### Issues to address
- Batch result ambiguity and minimal parser checks.
- Optimistic rollback depends on mutable pending map and broad assumptions.
- Single team update currently cast-based at service boundary.

### Planned contracts
- `SeededTeam`
- `SeedUpdateInput`
- `BatchSeedUpdateInput`
- `BatchSeedUpdateResult`
- `SeedMutationContext`
- `SeedMutationRollbackSnapshot`
- `SeedCacheValue`

### Cache typing plan
- Explicit query key constants for `['playoff-teams']` and `['seed-validation']`.
- Explicit cache value contract per key.
- Rollback snapshot should store pre-mutation values keyed by team ID.

---

## G. Auth / native login boundary analysis

### Issues to address
- `as unknown as` bridge from AuthError to PostgrestError.
- Native plugin result cast without explicit parse object.
- Weak-password metadata extraction via cast in hook.

### Planned contracts
- `NativeGoogleLoginResult`
- `NativeAuthTokenResult`
- `AuthWeakPasswordDetails`
- `AuthServiceResult`
- `AuthErrorDetails`
- `AuthProvider`
- `AuthBoundaryParseResult`

### Boundary policy
- Keep SDK result raw as `unknown` until parsed.
- Parse in auth boundary utility/service layer.
- Hooks receive app-owned auth result types only.

---

## H. Boundary mapping strategy

| Boundary | Raw input type | Parser/guard location | Internal type returned | Invalid data behavior |
|---|---|---|---|---|
| Supabase edge function request body | `unknown` JSON | `supabase/functions/create-bracket` parser helper | `CreateBracketPayload` | Throw (400-style error response) |
| Supabase query results | client generic output | `src/services/**` mappers | app domain rows/models | Throw via `handleDatabaseError` or validation error |
| Supabase RPC results | `unknown` | badge/seed services parsers | discriminated union result | Throw for critical failures; return explicit failure variant where current behavior expects continuation |
| localStorage retry payload | `unknown` JSON.parse | `FailedBadgeOperationsService` parse helper | `BadgeRetryParseResult` | Quarantine malformed entries + log |
| React Query cache snapshots | possibly undefined | optimistic seed hook helpers | `SeedCacheValue` | no-op + invalidate on mismatch |
| Native auth SDK responses | `unknown` plugin data | `src/utils/nativeAuth.ts` parser | `NativeAuthTokenResult` | return typed auth failure |
| brackets-manager DTOs | third-party weak DTO | read adapter/service boundary | internal playoff domain | throw or fallback with explicit unreachable guard |
| legacy playoff DB rows | Supabase row | read service mapper | `EditablePlayoffMatchData` | throw / not-found error path |

---

## I. Recommended small-diff implementation sequence

## Step 1 — Prereq contract alignment
- **Files likely touched:** shared types from Phases 1/2 + references in Phase 3 files
- **Casts likely removed:** none initially; inventory + alignment only
- **Expected behavior unchanged:** yes
- **Risk:** Low
- **Verification command:** `npm run typecheck`
- **Manual smoke test:** none required beyond app boot
- **Rollback strategy:** revert single commit

## Step 2 — Create-bracket generator DTO typing
- **Files likely touched:** `supabase/functions/create-bracket/index.ts`
- **Casts likely removed:** `matches any[]`, seeding pair `any`, `bracketResult any`
- **Expected behavior unchanged:** yes
- **Risk:** High
- **Verification command:** edge-function type/lint checks + `npm run typecheck`
- **Manual smoke test:** create single-elim + double-elim bracket
- **Rollback strategy:** revert PR

## Step 3 — Create-bracket insert payload typing
- **Files likely touched:** same edge function file
- **Casts likely removed:** loose insert payload assumptions
- **Expected behavior unchanged:** yes
- **Risk:** Medium
- **Verification command:** `npm run typecheck`
- **Manual smoke test:** create bracket and verify matches persisted
- **Rollback strategy:** revert PR

## Step 4 — Match edit read-service return typing
- **Files likely touched:** `BracketMatchReadService.ts`, read types files, hook usage
- **Casts likely removed:** match type/status casts in hook
- **Expected behavior unchanged:** yes
- **Risk:** Medium
- **Verification command:** `npm run typecheck && npm run test:file -- src/hooks/playoffs/usePlayoffEditMatch.ts`
- **Manual smoke test:** open both UUID and integer matches in editor
- **Rollback strategy:** revert PR

## Step 5 — Score update input/result contracts
- **Files likely touched:** hook + editor prop types + match utils
- **Casts likely removed:** ad hoc callback and result assumptions
- **Expected behavior unchanged:** yes
- **Risk:** Medium
- **Verification command:** `npm run typecheck`
- **Manual smoke test:** save score; confirm status/result display
- **Rollback strategy:** revert PR

## Step 6 — Badge RPC result contracts
- **Files likely touched:** `BadgeProcessingService.ts`
- **Casts likely removed:** generic unknown result assumptions
- **Expected behavior unchanged:** yes
- **Risk:** Medium
- **Verification command:** `npm run typecheck && npm run test:file -- src/services/BadgeProcessingService.ts`
- **Manual smoke test:** complete match and verify badge side effects run
- **Rollback strategy:** revert PR

## Step 7 — Badge retry discriminated union + parser
- **Files likely touched:** `FailedBadgeOperationsService.ts`, types
- **Casts likely removed:** shallow params trust
- **Expected behavior unchanged:** yes (except safer malformed payload handling)
- **Risk:** Medium
- **Verification command:** `npm run typecheck && npm run test:file -- src/services/FailedBadgeOperationsService.ts`
- **Manual smoke test:** inject malformed/local valid retry items; run retry
- **Rollback strategy:** revert PR

## Step 8 — Seed mutation cache/rollback contracts
- **Files likely touched:** `TeamSeedService.ts`, optimistic hooks
- **Casts likely removed:** `data as TeamSeedUpdateResult`, `error as Error`
- **Expected behavior unchanged:** yes
- **Risk:** Medium
- **Verification command:** `npm run typecheck && npm run test:file -- src/components/playoffs/form/bracket-teams/hooks/useOptimisticTeamMutations.ts`
- **Manual smoke test:** reseed teams; simulate error; verify rollback correctness
- **Rollback strategy:** revert PR

## Step 9 — Auth SDK boundary guards
- **Files likely touched:** `nativeAuth.ts`, `useAuthMethods.ts`, `AuthService.ts`
- **Casts likely removed:** `as unknown as PostgrestError`, plugin result cast, weak password cast
- **Expected behavior unchanged:** yes
- **Risk:** Medium
- **Verification command:** `npm run typecheck`
- **Manual smoke test:** web login/signup + native login + weak password flow
- **Rollback strategy:** revert PR

## Step 10 — Third-party containment pass
- **Files likely touched:** adapter containment files only where needed
- **Casts likely removed/contained:** unavoidable casts isolated into named helpers
- **Expected behavior unchanged:** yes
- **Risk:** Low-Medium
- **Verification command:** `npm run typecheck && npm run build`
- **Manual smoke test:** bracket viewer render regression check
- **Rollback strategy:** revert PR

---

## J. Ranked Phase 3 findings table

| Rank | Cluster | Files | Pattern | Bucket | Blast Radius (1-5) | Runtime Risk (1-5) | Ease of Replacement (1-5) | Priority Score | Why this matters | Recommended fix type |
|---:|---|---|---|---|---:|---:|---:|---:|---|---|
| 1 | Create-bracket generation payloads | `supabase/functions/create-bracket/index.ts` | `matches: any[]`, `pairs any`, `bracketResult any` | Bracket graph generation any / Persisted write-path any | 5 | 5 | 3 | 13 | Can persist malformed tournament graph | Edge-function internal DTO contracts |
| 2 | Create-bracket branch result ambiguity | same | format-dependent `any` result object | Supabase query/RPC result any | 5 | 5 | 4 | 14 | Wrong branch shape hidden until runtime | Discriminated result union |
| 3 | Match edit mapping casts | `usePlayoffEditMatch.ts` | status/matchType casts | Match score/update any | 4 | 5 | 3 | 12 | Wrong mapping can break score edit state | service-level mapper contracts |
| 4 | Badge RPC weak result typing | `BadgeProcessingService.ts` | `Promise<unknown>` RPC results | Badge RPC/result any | 4 | 4 | 4 | 12 | Failing side-effects become opaque | RPC success/failure unions |
| 5 | Retry parser shallow params check | `FailedBadgeOperationsService.ts` | params only object-check | Retry payload/storage any | 4 | 5 | 3 | 12 | Bad replay payload can fail repeatedly silently | discriminated parser + quarantine |
| 6 | Seed service casted return | `TeamSeedService.ts` | `data as TeamSeedUpdateResult` | Persisted write-path any | 4 | 4 | 4 | 12 | Compiler silence on write return truth | explicit row parser/selector typing |
| 7 | Optimistic rollback state assumptions | `useOptimisticTeamMutations.ts` | mutable pending map timing, `error as Error` | Optimistic update/cache any | 3 | 4 | 3 | 10 | UI can report false success | typed rollback snapshot/context |
| 8 | Auth error bridge cast | `AuthService.ts` | `as unknown as PostgrestError` | Auth SDK boundary any | 3 | 4 | 4 | 11 | Error metadata may be mislabeled | explicit auth error mapper contract |
| 9 | Native SDK response cast | `nativeAuth.ts` | `response as NativeGoogleLoginResult` | Auth SDK boundary any | 3 | 4 | 3 | 10 | Token extraction can break quietly | boundary parser guard |
| 10 | Dialog broad bag prop | `PlayoffDialogs.tsx` | `Record<string, any>` | Low-value local any | 2 | 2 | 5 | 9 | Weakens team-division data flow confidence | narrow prop contract |

---

## K. Regression risks (explicit)
- Bracket creation writes malformed match graph.
- Double-elimination loser bracket feed breaks.
- BYE handling changes accidentally.
- Playoff score save succeeds but badge side effects fail silently.
- Failed badge retries replay wrong payloads.
- Old retry queue payloads crash parsing.
- Optimistic seed update reports success but rollback is wrong.
- React Query cache gets wrong shape and UI desyncs.
- Legacy UUID match edit path breaks.
- BM integer match edit path breaks.
- Match status/result mapping narrows incorrectly.
- Native login token extraction breaks.
- Weak-password details disappear.
- Auth errors become swallowed/mislabeled.

---

## L. Verification plan

### Actual scripts available (from `package.json`)
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:file -- <path>`
- `npm run test:coverage`
- `npm run test:coverage:serial`
- `npm run build`

### Minimum verification matrix for each Phase 3 PR
1. TypeScript check.
2. Lint.
3. Focused tests for touched area (if present).
4. Build.

### Manual smoke tests (required across phase)
- Create/load single elimination bracket.
- Create/load double elimination bracket.
- Confirm BYE behavior unchanged.
- Confirm loser bracket feed unchanged.
- Confirm bracket viewer still renders matches/participants.
- Edit playoff match score.
- Complete a match.
- Confirm match status/result UI updates.
- Confirm badges process after completion.
- Force/inspect failed badge retry behavior.
- Seed/reseed teams.
- Confirm optimistic update + rollback behavior.
- Test native/web login if auth touched.
- Confirm weak-password messaging if signup touched.

---

## M. Safe-to-ignore / contain (Phase 3 scope)

1. Unavoidable brackets-viewer global casts
- **Why acceptable:** third-party display boundary; not core write path.
- **How to document:** boundary comment + typed adapter wrapper.
- **What not to do:** don’t spread these casts into services/hooks.

2. Isolated brackets-manager adapter casts
- **Why acceptable:** manager DTO boundary where typings can be weak.
- **How to document:** named containment helper with rationale.
- **What not to do:** don’t cast in business services.

3. Storybook shims
- **Why acceptable:** non-production runtime.
- **How to document:** test/dev-only note.
- **What not to do:** don’t mix with app runtime types.

4. Icon registry broad component typing
- **Why acceptable:** low runtime risk compared to Phase 3 flows.
- **How to document:** technical debt list.
- **What not to do:** don’t prioritize over write-path fixes.

5. Recharts payload casts already isolated by Phase 2
- **Why acceptable:** already contained and non-write-critical.
- **How to document:** link to containment location.
- **What not to do:** no broad chart typing campaign in Phase 3.

6. Test-only anys outside business-critical coverage
- **Why acceptable:** low production impact.
- **How to document:** exclude list in phase notes.
- **What not to do:** avoid touching unless required for critical-flow tests.

---

## N. Non-goals
- No source implementation in this planning artifact.
- No strict mode enablement.
- No broad eslint unsafe-any rollout.
- No database migrations.
- No Supabase schema changes.
- No RLS policy changes.
- No bracket algorithm rewrite.
- No bracket generation behavior changes.
- No loser bracket feed changes.
- No BYE behavior changes.
- No badge award logic changes.
- No auth behavior changes.
- No mass UI cleanup.
- No full third-party type purity campaign.

---

## O. Final Phase 3 roadmap

## 1) Top 10 Phase 3 targets (descending)
1. `supabase/functions/create-bracket/index.ts` — generator `any` removal.
2. `supabase/functions/create-bracket/index.ts` — typed insert payloads.
3. `src/services/brackets/read/BracketMatchReadService.ts` — typed read mapper split.
4. `src/hooks/playoffs/usePlayoffEditMatch.ts` — remove cast-based mapping.
5. `src/hooks/matches/utils/matchDatabaseUtils.ts` — typed score update and completion result.
6. `src/services/BadgeProcessingService.ts` — typed RPC result unions.
7. `src/services/FailedBadgeOperationsService.ts` — discriminated retry parser + quarantine.
8. `src/services/teams/TeamSeedService.ts` — remove cast return and tighten batch parser.
9. `src/components/playoffs/form/bracket-teams/hooks/useOptimisticTeamMutations.ts` — typed rollback snapshot/cache.
10. `src/services/auth/AuthService.ts` + `src/utils/nativeAuth.ts` + `src/hooks/auth/useAuthMethods.ts` — auth boundary typing.

## 2) Top 5 safest quick wins
1. Replace `Record<string, any>` in `PlayoffDialogs` with specific division/team map type.
2. Replace `as unknown as PostgrestError` with explicit auth error mapping contract.
3. Add operation-specific `params` guards in retry parser.
4. Introduce explicit `MatchScoreUpdateInput/Result` alias contracts used by hook/editor.
5. Tighten `TeamSeedService` single/batch parser contracts to remove cast trust.

## 3) Top 5 dangerous areas
1. Create-bracket three-pass generation and match reference wiring.
2. Double-elimination loser feed + grand finals reset mapping.
3. Badge retry replay with malformed historic payloads.
4. Optimistic seed rollback synchronization with cache truth.
5. Native auth token extraction and weak-password metadata path.

## 4) Suggested implementation order for 1 week
- Day 1: PR 1 (prereq alignment)
- Day 2: PR 2 (create-bracket DTO typing)
- Day 3: PR 3 (create-bracket insert payload typing)
- Day 4: PR 4 (match edit read-model typing)
- Day 5: PR 5 (match score update contracts)

## 5) Suggested implementation order for 2 weeks
- Week 1: PRs 1–5
- Week 2:
  - PR 6 (badge RPC result typing)
  - PR 7 (badge retry parser/union)
  - PR 8 (seed optimistic rollback/cache typing)
  - PR 9 (auth/native boundary typing)
  - PR 10 (third-party containment final pass)

## 6) Prerequisites from Phase 1/2
- Shared playoff domain contracts are present and stable.
- Existing seeding types are stable (`TeamSeedUpdateInput`, batch result contracts).
- Error utilities remain standard (`handleDatabaseError`, `ensureFound`).
- Existing BM/viewer containment boundaries are intact and not refactored in parallel.

---

## Safe PR breakdown for Phase 3 implementation

### PR 1
**Title:** Phase 3 prerequisites check / contract alignment  
**Goal:** Confirm Phase 1/2 contracts exist and identify missing prerequisites before write-path typing.  
**Files likely touched:** planning notes + minimal shared types index references only.  
**Unsafe patterns addressed:** None directly; dependency inventory only.  
**Contracts/types introduced:** none or tiny aliases only if strictly required.  
**Behavior changes:** **none**.  
**Why this PR is safe:** no runtime logic change.  
**Regression risks:** very low.  
**Verification commands:** `npm run typecheck`, `npm run lint`.  
**Manual smoke tests:** app boot and playoff page load.  
**Rollback plan:** revert PR.  
**Follow-up PR unlocked:** PR 2.

### PR 2 — STATUS: ❌ OUTSTANDING (detailed spec)

**Title:** Create-bracket generator DTO typing
**Goal:** Type generated bracket match structures and seeding pairs without changing algorithm output.

**Exact `any` sites still in the repo (verified 2026-05-12):**
- `supabase/functions/create-bracket/index.ts:95` — `const matches: any[] = [];` inside `generateSingleElimination`.
- `supabase/functions/create-bracket/index.ts:164` — `const pairs: Array<{ team1: any; team2: any }> = [];` inside `generateSeedingPairs`.
- `supabase/functions/create-bracket/index.ts:202` — `const matches: any[] = [];` inside `generateDoubleElimination`.
- `supabase/functions/create-bracket/index.ts:653` — `let bracketResult: any = null;` in the serve handler before the format branch.

**Files likely touched:**
- `supabase/functions/create-bracket/index.ts` (primary; replace `any` sites; leave algorithm untouched).
- New: `supabase/functions/create-bracket/types.ts` (adjacent, edge-only module — keeps Deno-style imports separate from the app's `src/` types and avoids accidentally pulling Node/React deps into the edge function bundle).

**Why a separate `types.ts` next to the edge function (not `src/types/`):**
- Edge function runs on Deno, not Vite/Node. Importing from `@/...` would not resolve.
- Edge function `any` is a generation-internal contract, not a domain contract. It should not leak into the app.
- Phase 3 architecture rule: "Raw DB/RPC/SDK input" vs "internal 717REC domain" vs "third-party DTOs" must stay separated. The generator output is a fourth world — *edge-function-internal* — and belongs in its own file.

**Contracts/types to introduce (PR 2 only — generation side, NOT insert payloads):**

```ts
// supabase/functions/create-bracket/types.ts (planned shape — do NOT implement until PR is approved)

export type BracketFormat = 'singleElim' | 'doubleElim';

export type GeneratedMatchType = 'winners' | 'losers' | 'finals';
export type GeneratedMatchStatus = 'pending';

export interface SeedTeam {
  id: string;
  name: string;
  seed?: number;
}

export interface SeedingPair {
  team1: SeedTeam | null;
  team2: SeedTeam | null;
}

/**
 * Shape of a row pushed into `matches` arrays inside BracketGenerator.
 * Must match exactly what is later inserted into `playoff_matches`.
 * Nullable fields stay nullable — BYEs and uninitialized references depend on it.
 */
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

/** Discriminated union so the serve handler narrows on `format` instead of `any`. */
export type GeneratedBracketResult =
  | SingleElimGenerationResult
  | DoubleElimGenerationResult;
```

**Mapping from `any` sites → new types:**
| Line | Current | Replace with |
|---|---|---|
| 95  | `const matches: any[] = [];` | `const matches: GeneratedBracketMatch[] = [];` |
| 156 (return) | `return { matches, matchIdMap };` | annotate `generateSingleElimination` return as `SingleElimGenerationResult` (with `format: 'singleElim'` added to the returned object) |
| 164 | `const pairs: Array<{ team1: any; team2: any }> = [];` | `const pairs: SeedingPair[] = [];` |
| 202 | `const matches: any[] = [];` | `const matches: GeneratedBracketMatch[] = [];` |
| 365 (return) | `return { matches, winnersMatchIds, losersMatchIds, grandFinalsR1Id, grandFinalsR2Id };` | annotate `generateDoubleElimination` return as `DoubleElimGenerationResult` (with `format: 'doubleElim'` added) |
| 653 | `let bracketResult: any = null;` | `let bracketResult: GeneratedBracketResult \| null = null;` |

**Why adding `format` to each result is non-behavioral:**
- The handler at lines 656–662 already branches on `payload.format`. Adding the same value as a field lets TS narrow `bracketResult` after the branch. The emitted JSON response does not include `bracketResult` directly; only `bracket` and `matches_generated` are returned (lines 863–875). So no API contract change.

**Behavior changes:** **none**. Algorithm output is identical. The `matches` array elements have the exact same property set, same nullability, same status string `'pending'`, same `match_type` literals.

**Critical guard rails (reviewers MUST verify):**
1. `team1_id`, `team2_id`, `team1_seed`, `team2_seed`, `next_win_match_id`, `next_lose_match_id` MUST remain nullable in the type. Narrowing these to non-null breaks BYE handling at line 122–134 and the three-pass wiring at lines 668–838.
2. `match_type` literal union must include `'winners' | 'losers' | 'finals'`. Do NOT add `'play-in'`, `'consolation'`, etc., even if they look "obvious." The algorithm only emits those three today (lines 141, 277, 312, 333, 349). Adding extras invites future drift.
3. Do not promote the new types into `src/types/`. Keep them edge-only.
4. Do not change `best_of` from `number` to a literal union. Single-elim uses 3 (line 148), grand finals use 5 (lines 340, 356). Literal narrowing here is a footgun.
5. Do not change `status` semantics. Today every generated match starts as `'pending'`. The status union may legitimately widen later when the manager runs — but at *generation time* `'pending'` is the only legal value.
6. Discriminated union (`format` field) must be added to the returned objects from the generator methods, otherwise the handler narrowing at line 656–662 is purely structural and TS may still permit cross-shape mistakes.

**Why this PR is safe:** algorithm untouched; type-only shape contracts; no insert payload types yet (those land in PR 3).

**Regression risks:**
- **High** if a reviewer accidentally narrows nullable fields → bracket creation writes malformed graphs (`Top 3 dangerous areas` row 1).
- **Medium** if `match_type` union accidentally omits `'losers'` or `'finals'` → double-elimination loser feed breaks.
- **Low** for the rest — type-only annotation in functions whose return values are passed straight to `supabaseAdmin.from('playoff_matches').insert(...)` which already coerces structurally.

**Verification commands:**
- `npm run typecheck` (app-side; should be unchanged).
- `deno check supabase/functions/create-bracket/index.ts` if available locally (edge-function type check).
- `npm run lint`.
- Whatever Supabase edge-function workflow the repo uses on CI (`.github/workflows/` includes a coverage check and dependency check — confirm during PR which workflow validates edge functions).

**Manual smoke tests:**
- Create a single-elimination bracket with 8 teams (no byes). Verify match count, round counts, and that `next_win_match_id` references are correctly populated.
- Create a single-elimination bracket with 5–7 teams (forces byes). Verify BYE matches are inserted with `team_id` nulls.
- Create a double-elimination bracket with 8 teams. Verify winners bracket, losers bracket, **both** grand finals matches (R1 and R2 reset), and that loser bracket feed lines up (every winners match has a `next_lose_match_id`).
- Spot-check the persisted `playoff_matches` rows in Supabase to confirm column values are unchanged versus pre-PR baseline.

**Rollback plan:** revert the PR. Edge function is stateless; no schema or data migration to undo.

**Follow-up PR unlocked:** PR 3 (insert payload typing) — which can then reuse `GeneratedBracketMatch` as the input type for the typed `BracketInsertPayload` / `PlayoffMatchInsertPayload` contracts.

**Out of scope for PR 2 (do NOT bundle in):**
- Typing the `tournamentData` / `participantData` / `startData` Challonge responses. Those are Challonge SDK boundary and belong in a separate containment pass.
- Typing the Supabase `insert(...).select(...).single()` return shapes. That is PR 3.
- Touching `BracketGenerator.calculateBracketSize` / `calculateRounds`. Algorithm is frozen.
- Adding runtime validation (zod, etc.) for the request body. That is a separate hardening PR if desired.

### PR 3
**Title:** Create-bracket insert payload typing  
**Goal:** Type Supabase insert/update payloads for bracket/playoff match writes, preserving existing behavior.  
**Files likely touched:** `supabase/functions/create-bracket/index.ts`.  
**Unsafe patterns addressed:** loose insert payload shape trust.  
**Contracts/types introduced:** `BracketInsertPayload`, `PlayoffMatchInsertPayload`.  
**Behavior changes:** **none**.  
**Why this PR is safe:** SQL calls/columns remain same; only compile-time correctness improves.  
**Regression risks:** medium if required nullable fields accidentally narrowed.  
**Verification commands:** `npm run typecheck`, `npm run lint`.  
**Manual smoke tests:** create bracket and verify persisted match graph integrity.  
**Rollback plan:** revert PR.  
**Follow-up PR unlocked:** PR 10 later containment confidence.

### PR 4
**Title:** Match edit read-model typing  
**Goal:** Type `BracketMatchReadService` returns and separate legacy UUID path from BM integer path mapping.  
**Files likely touched:** `src/services/brackets/read/BracketMatchReadService.ts`, related read types, `usePlayoffEditMatch.ts`.  
**Unsafe patterns addressed:** mapping casts for match type/status/current bracket shape.  
**Contracts/types introduced:** `BracketManagerEditableMatch`, `EditablePlayoffMatchData`, `PlayoffGameRow`.  
**Behavior changes:** **none**.  
**Why this PR is safe:** route logic unchanged; only shape mapping centralized and typed.  
**Regression risks:** medium around null opponents and status mapping.  
**Verification commands:** `npm run typecheck`, `npm run test:file -- src/hooks/playoffs/usePlayoffEditMatch.ts`, `npm run lint`.  
**Manual smoke tests:** open/edit legacy UUID match and BM integer match.  
**Rollback plan:** revert PR.  
**Follow-up PR unlocked:** PR 5.

### PR 5
**Title:** Match score update input/result contracts  
**Goal:** Type score editor inputs, match completion result, and refetch callback contracts.  
**Files likely touched:** `MatchScoreEditor/types.ts`, `PlayoffDialogs.tsx`, `usePlayoffEditMatch.ts`, `matchDatabaseUtils.ts`, match update services.  
**Unsafe patterns addressed:** ad hoc score payload shapes and callback typing gaps.  
**Contracts/types introduced:** `MatchScoreUpdateInput`, `MatchScoreUpdateResult`, `CompletedMatchResult`, `AsyncVoidCallback` alignment.  
**Behavior changes:** **none**.  
**Why this PR is safe:** no persistence rule changes; contract consistency only.  
**Regression risks:** medium around result/status mapping and editor save flow.  
**Verification commands:** `npm run typecheck`, `npm run lint`, `npm run test:file -- src/hooks/playoffs/usePlayoffEditMatch.ts`.  
**Manual smoke tests:** save score, complete match, verify bracket/status refresh.  
**Rollback plan:** revert PR.  
**Follow-up PR unlocked:** PR 6.

### PR 6
**Title:** Badge RPC result typing  
**Goal:** Type badge RPC response envelopes while preserving badge award behavior and partial failure handling.  
**Files likely touched:** `src/services/BadgeProcessingService.ts`, optional shared badge types.  
**Unsafe patterns addressed:** generic `Promise<unknown>` return contracts.  
**Contracts/types introduced:** `BadgeRpcSuccess`, `BadgeRpcFailure`, `BadgeRpcResult`.  
**Behavior changes:** **none**.  
**Why this PR is safe:** RPC names/inputs unchanged; only typed interpretation added.  
**Regression risks:** medium if parser wrongly rejects valid result variants.  
**Verification commands:** `npm run typecheck`, `npm run lint`, focused badge service tests if present.  
**Manual smoke tests:** complete match; confirm badge ops continue independently.  
**Rollback plan:** revert PR.  
**Follow-up PR unlocked:** PR 7.

### PR 7
**Title:** Badge retry queue typing and parser  
**Goal:** Add discriminated retry operation payload typing and safe localStorage parser strategy.  
**Files likely touched:** `src/services/FailedBadgeOperationsService.ts`, badge retry types.  
**Unsafe patterns addressed:** shallow `params` object validation and replay trust.  
**Contracts/types introduced:** `BadgeRetryStoragePayload`, `BadgeRetryParseResult`, refined discriminated params union.  
**Behavior changes:** **none** expected for valid payloads; malformed legacy payloads quarantined (safe behavior).  
**Why this PR is safe:** retry worker remains tolerant; no valid payload drop.  
**Regression risks:** medium-high if parser over-restricts older but valid payload variants.  
**Verification commands:** `npm run typecheck`, `npm run lint`, focused retry tests.  
**Manual smoke tests:** inject valid + malformed queue items and run retry flow.  
**Rollback plan:** revert PR.  
**Follow-up PR unlocked:** better production observability and admin queue trust.

### PR 8
**Title:** Seed mutation rollback/cache typing  
**Goal:** Type optimistic cache value, rollback snapshots, and batch result interpretation.  
**Files likely touched:** `TeamSeedService.ts`, `BracketWriteService.ts`, `useOptimisticTeamMutations.ts`, `useTeamSeedMutation.ts`.  
**Unsafe patterns addressed:** casted seed update return, `error as Error`, rollback assumptions.  
**Contracts/types introduced:** `SeedMutationContext`, `SeedMutationRollbackSnapshot`, `SeedCacheValue`, tightened `BatchSeedUpdateResult`.  
**Behavior changes:** **none**.  
**Why this PR is safe:** preserves optimistic UX; only formalizes rollback truth and result parsing.  
**Regression risks:** medium around partial success rollback edge-cases.  
**Verification commands:** `npm run typecheck`, `npm run lint`, focused seed hook tests if present.  
**Manual smoke tests:** batch reseed, partial failure simulation, rollback confirmation.  
**Rollback plan:** revert PR.  
**Follow-up PR unlocked:** predictable seed mutation observability.

### PR 9
**Title:** Auth/native SDK boundary typing  
**Goal:** Parse native SDK responses safely and type weak-password/auth-error details without behavior change.  
**Files likely touched:** `src/utils/nativeAuth.ts`, `src/hooks/auth/useAuthMethods.ts`, `src/services/auth/AuthService.ts`.  
**Unsafe patterns addressed:** `as unknown as PostgrestError`, native response cast, weak-password cast extraction.  
**Contracts/types introduced:** `NativeAuthTokenResult`, `AuthWeakPasswordDetails`, `AuthServiceResult`, `AuthBoundaryParseResult`.  
**Behavior changes:** **none**.  
**Why this PR is safe:** keeps same auth providers and flows; improves boundary truth.  
**Regression risks:** medium around provider-specific token fields and error messaging.  
**Verification commands:** `npm run typecheck`, `npm run lint`.  
**Manual smoke tests:** web login/signup, native login, weak-password messaging path.  
**Rollback plan:** revert PR.  
**Follow-up PR unlocked:** cleaner auth hooks without casts.

### PR 10
**Title:** Third-party containment cleanup  
**Goal:** Localize unavoidable brackets-manager/brackets-viewer casts behind named boundary helpers.  
**Files likely touched:** containment adapter files only (`brackets-viewer` / BM adapter boundaries).  
**Unsafe patterns addressed:** scattered boundary casts outside containment.  
**Contracts/types introduced:** named boundary helper wrappers and comments documenting why cast is contained.  
**Behavior changes:** **none**.  
**Why this PR is safe:** containment-only pass after app-owned contracts stabilize.  
**Regression risks:** low-medium if helper accidentally changes mapped shape.  
**Verification commands:** `npm run typecheck`, `npm run lint`, `npm run build`.  
**Manual smoke tests:** bracket viewer render + match interaction sanity checks.  
**Rollback plan:** revert PR.  
**Follow-up PR unlocked:** future low-risk refactoring of third-party adapters.

---

## Recommended PR order with risk/value/dependency

| PR | Risk | Expected Value | Suggested Review Focus | Merge Independently | Depends On |
|---:|---|---|---|---|---|
| 1 | Low | High | prerequisite correctness and scope lock | Yes | None |
| 2 | High | High | bracket generation shape parity and nullability | Yes | 1 |
| 3 | Medium | High | insert payload field parity and null handling | Yes | 2 |
| 4 | Medium | High | legacy vs BM domain split correctness | Yes | 1 |
| 5 | Medium | High | score update contracts and callback paths | Yes | 4 |
| 6 | Medium | High | RPC result unions without behavior drift | Yes | 1 |
| 7 | Medium | High | retry parser tolerance + quarantine behavior | Yes | 6 |
| 8 | Medium | High | optimistic rollback truth and batch partial failures | Yes | 1 |
| 9 | Medium | Medium-High | native token parse + auth error/weak-password details | Yes | 1 |
| 10 | Low-Medium | Medium | strict boundary containment only | Yes | 2,3,4,5,6,7,8,9 |

**The safest implementation approach is small PRs in this order, not one large unsafe typing sweep.**

---

## Final required output

### 1. Top 10 Phase 3 targets in descending order
1. Create-bracket generation `any` removal.
2. Create-bracket insert payload typing.
3. Match edit read-model type split (legacy UUID vs BM integer).
4. Match score update input/result contracts.
5. Badge RPC result contracts.
6. Badge retry parser discriminated unions + quarantine.
7. Seed batch/single mutation result typing.
8. Optimistic rollback/cache snapshot typing.
9. Auth service boundary error/result typing.
10. Third-party cast containment cleanup.

### 2. Top 5 safest quick wins
1. `PlayoffDialogs` `teamsByDivision` contract tightening.
2. Auth error bridge cast removal.
3. Retry params operation-specific validation.
4. Score update contract aliases for hook/editor.
5. Team seed service cast removal.

### 3. Top 5 dangerous areas where bad types could corrupt data or hide real bugs
1. Edge bracket generation and graph wiring.
2. Double-elim loser feed and grand finals reset path.
3. Badge retry queue replay with malformed payloads.
4. Optimistic seed rollback cache desync.
5. Native token extraction and auth error labeling.

### 4. Suggested implementation order for 1 week
PRs 1–5.

### 5. Suggested implementation order for 2 weeks
PRs 1–10 in recommended sequence.

### 6. Prerequisites from Phase 1/2 that must be complete before implementation
- Stable shared playoff domain contracts.
- Stable seed input/result contracts.
- Stable error utility patterns.
- Stable third-party containment boundaries.

### 7. Safe PR breakdown for Phase 3 implementation
See “Safe PR breakdown for Phase 3 implementation” section above (PR 1–PR 10).

**Ready for implementation only after this Phase 3 plan and PR breakdown are reviewed.**

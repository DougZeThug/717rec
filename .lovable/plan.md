

## Fix: Deduplicate Constants, Utility, and Error Handling (2B, 2C, 2D)

### 2B. Extract fallback image URL to a shared constant

**New file: `src/constants/images.ts`**
```typescript
export const FALLBACK_TEAM_IMAGE = 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
```

**Update 5 files** to import and use the constant instead of the hardcoded URL:
- `src/components/admin/scores/MatchScoreItem.tsx` (2 occurrences)
- `src/components/admin/matches/MatchApprovalItem.tsx` (2 occurrences)
- `src/components/home/MatchCard.tsx` (1 occurrence)
- `src/components/home/TeamLogo.tsx` (1 occurrence)
- `src/components/playoffs/ChampionDisplay.tsx` (1 occurrence)

Each `onError` handler changes from the inline URL string to `FALLBACK_TEAM_IMAGE`.

### 2C. Extract `parseMetadata` to a shared utility

**New file: `src/utils/parseMetadata.ts`**
```typescript
export const parseMetadata = (metadataStr: string): Record<string, unknown> => {
  try { return JSON.parse(metadataStr); }
  catch { return {}; }
};
```

**Update 3 files** — remove the local `parseMetadata` function and import from the shared utility:
- `src/components/admin/hero-cards/form-sections/ChampionsEditor.tsx`
- `src/components/admin/hero-cards/form-sections/EventWinnersEditor.tsx`
- `src/components/admin/hero-cards/form-sections/TargetingDisplaySection.tsx`

### 2D. Fix error swallowing in hooks

**`src/hooks/usePendingScoresMatches.ts`** (lines 99-106)

The `submitScore` wrapper catches errors and returns `false`, but `mutateAsync` already triggers the `onError` callback which shows a toast. The wrapper is redundant — simplify to just re-throw so callers can handle it, or remove the try/catch since TanStack Query's `onError` already handles the toast:

```typescript
const submitScore = async (matchId: string, submission: ScoreSubmission): Promise<boolean> => {
  try {
    await submitMutation.mutateAsync({ matchId, submission });
    return true;
  } catch (error) {
    // Error toast already shown by mutation's onError callback
    // Re-throw so callers know it failed
    throw error;
  }
};
```

**`src/hooks/auth/useAuthProfile.ts`** (lines 31-34)

`refreshProfile` silently swallows errors. Add error logging so failures are visible:

```typescript
const refreshProfile = useCallback(async () => {
  if (!user) return;
  try {
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  } catch (error) {
    errorLog('Failed to refresh profile:', error);
  }
}, [user, fetchProfile]);
```

This logs the error instead of silently failing. We don't throw here because `refreshProfile` is called in fire-and-forget contexts (profile setup callback), so a toast or log is more appropriate than crashing.

### Summary

| Action | Files |
|--------|-------|
| New `src/constants/images.ts` | 1 new file |
| New `src/utils/parseMetadata.ts` | 1 new file |
| Update fallback URL imports | 5 files |
| Update parseMetadata imports | 3 files |
| Fix error swallowing | 2 files |

Twelve files total, no behavior changes except errors are now logged/re-thrown instead of swallowed.




## Plan: Fix Stale Closure Race Check in refreshProfile

### The problem

In `useAuthProfile.ts`, `refreshProfile` captures `user` in its closure. The check `if (user?.id !== fetchUserId) return` compares two values from the same closure — it can never detect a user change mid-flight. Cross-tab sign-in can cause User B to see User A's profile.

### The fix

**1 file** — `src/hooks/auth/useAuthProfile.ts`

Add a `useRef` to track the current user ID, updated via `useEffect`. Compare against the ref instead of the closure variable:

```typescript
const currentUserIdRef = useRef<string | null>(null);

useEffect(() => {
  currentUserIdRef.current = user?.id ?? null;
}, [user]);

const refreshProfile = useCallback(async () => {
  if (!user) return;
  const fetchUserId = user.id;
  try {
    const profileData = await fetchProfile(fetchUserId);
    if (currentUserIdRef.current !== fetchUserId) return;
    setProfile(profileData);
  } catch (error) {
    errorLog('Failed to refresh profile:', error);
  }
}, [user, fetchProfile]);
```

This matches the mutable `currentUserId` pattern already used in `src/hooks/auth/index.ts`.

### What changes

- **1 file** — `src/hooks/auth/useAuthProfile.ts`: add `useRef` + `useEffect`, update race check
- **0 migrations, 0 other files**


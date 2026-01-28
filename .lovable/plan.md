
# Plan: Fix Potential Open Redirect Vulnerability

## Overview
Add validation for the `returnTo` parameter to prevent potential open redirect attacks. While `window.location.pathname` is already relatively safe (it only returns the path portion), adding explicit validation provides defense-in-depth.

## Analysis

**Current Flow:**
1. Multiple components set `returnTo` when redirecting to `/auth`:
   - `AuthContext.tsx` - uses `window.location.pathname`
   - `ProtectedAdminRoute.tsx` - uses `location.pathname`
   - `LoginPrompt.tsx` - hardcoded `/message-board`
   - `AdminDashboard.tsx` - hardcoded `/admin`
   - `ProfileSetup.tsx` - hardcoded `/setup-profile`
   - `AdminAccessModal.tsx` - hardcoded `/admin`

2. `Auth.tsx` (line 44) consumes and navigates to `returnTo`

**Risk Assessment:**
- `window.location.pathname` and React Router's `location.pathname` already only return the path portion (no protocol/host)
- However, protocol-relative URLs like `//evil.com` could bypass naive checks
- Best practice: validate at the consumption point

## Changes

### 1. Create Utility Function
**File:** `src/utils/auth/sanitizeReturnTo.ts` (new file)

```typescript
/**
 * Sanitizes a return URL to prevent open redirect attacks.
 * Only allows internal paths starting with a single slash.
 * 
 * @param pathname - The path to validate
 * @returns Safe internal path or '/' as fallback
 */
export const sanitizeReturnTo = (pathname: string | undefined): string => {
  // Default to home if no path provided
  if (!pathname) return '/';
  
  // Must start with exactly one slash (not protocol-relative //)
  // and not contain any protocol indicators
  if (
    pathname.startsWith('/') && 
    !pathname.startsWith('//') &&
    !pathname.includes(':')
  ) {
    return pathname;
  }
  
  return '/';
};
```

### 2. Apply Validation in Auth.tsx
**File:** `src/pages/Auth.tsx` (line 23)

```typescript
import { sanitizeReturnTo } from '@/utils/auth/sanitizeReturnTo';

// Change:
const returnTo = state?.returnTo || '/';

// To:
const returnTo = sanitizeReturnTo(state?.returnTo);
```

## Why This Approach

1. **Single validation point**: Validate where the redirect actually happens (Auth.tsx)
2. **Defense in depth**: Even though pathname is already safe, explicit validation adds security
3. **Reusable utility**: Can be used elsewhere if needed
4. **No breaking changes**: All existing hardcoded paths (`/admin`, `/message-board`, etc.) pass validation

## Files Changed

| File | Change |
|------|--------|
| `src/utils/auth/sanitizeReturnTo.ts` | New utility function |
| `src/pages/Auth.tsx` | Import and use sanitizeReturnTo |

**Total: 2 files**

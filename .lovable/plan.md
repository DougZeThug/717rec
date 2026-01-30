

# Plan: Update Production Dependencies

## Overview
Update 7 production dependencies to their latest minor/patch versions as specified.

## Updates to Apply

| Package | Current | Target |
|---------|---------|--------|
| @capacitor/core | ^8.0.0 | ^8.0.1 |
| @capgo/capacitor-social-login | ^8.2.13 | ^8.2.16 |
| @sentry/react | ^10.33.0 | ^10.36.0 |
| @supabase/supabase-js | ^2.90.1 | ^2.91.1 |
| @tanstack/react-query | ^5.90.16 | ^5.90.20 |
| framer-motion | ^12.26.1 | ^12.29.0 |
| lucide-react | ^0.562.0 | ^0.563.0 |

## Risk Assessment

All updates are **semver-compatible** (minor/patch only):
- **Patch updates** (8.0.0→8.0.1, etc.): Bug fixes only, zero risk
- **Minor updates** (12.26.1→12.29.0, etc.): New features, backward compatible

No breaking changes expected since all packages follow semver.

## Implementation

**File:** `package.json`

Update the version strings in the `dependencies` section to reflect the new versions.

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Update 7 dependency versions |

**Total: 1 file modified**


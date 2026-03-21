

## Fix WeeklyRecapCard TeamLogo sizing

### Problem
1. `WeeklyRecapCard` uses `size="xs"` on `TeamLogo`, but that size doesn't exist — causing the build error and falling back to huge default rendering.
2. Logos should be small squares, not large circles.

### Changes

**File: `src/components/shared/TeamLogo.tsx`**
- Add `'xs'` to the size type: `size?: 'xs' | 'sm' | 'md' | 'lg'`
- Add xs size class: `xs: 'w-5 h-5 min-w-5 min-h-5'`

**File: `src/components/home/WeeklyRecapCard.tsx`**
- Change all `rounded` props on TeamLogo from `rounded` to remove them (or set `rounded={false}`) so logos render as squares instead of circles.


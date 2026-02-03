
## Codebase Audit Results

I've completed a thorough audit of the codebase. Here are the issues found, categorized by severity:

---

### Bug: React Ref Warning in ChampionsHeroCard

**File**: `src/components/hero/ChampionsHeroCard.tsx`  
**Severity**: Medium (causes console warning, potential future breakage)

**Issue**: The `ChampionCardCompact` component (lines 23-93) is used inside `CarouselItem` which attempts to forward a ref. However, `ChampionCardCompact` is a regular function component that doesn't accept refs, causing the React warning:

```
Warning: Function components cannot be given refs. Attempts to access this ref will fail.
Check the render method of `ChampionsHeroCard`.
```

**Fix**: Wrap `ChampionCardCompact` with `React.forwardRef` similar to how `ChampionDisplay` (lines 95-173) is already properly implemented.

---

### Code Quality: Unused Import

**File**: `src/components/admin/hero-cards/HeroCardsTab.tsx` (line 6)  
**Severity**: Low (dead code)

**Issue**: `useHeroCardMutations` is imported but never used in the component.

```typescript
import { useAllHeroCards, useHeroCardMutations } from '@/hooks/useHeroCards';
```

**Fix**: Remove the unused import.

---

### Code Quality: Unused State Variable

**File**: `src/components/playoffs/form/bracket-teams/hooks/useFormStateManager.ts` (line 31)  
**Severity**: Low (dead code)

**Issue**: The `isSaving` state is declared and set, but never read or exposed.

```typescript
const [isSaving, setIsSaving] = useState(false);
```

**Fix**: Either remove the unused state or expose it in the return object if it's needed for future functionality.

---

### Code Quality: Unused Function Parameter

**File**: `src/components/playoffs/form/useBracketForm.ts` (line 9)  
**Severity**: Low (dead code)

**Issue**: The `teams` parameter is accepted in the hook props but never used in the hook body.

```typescript
export const useBracketForm = ({ teams, onSubmit }: UseBracketFormProps) => {
  // teams is never used
```

**Fix**: Remove the unused parameter or implement the intended functionality.

---

### Database: RLS Warnings (15 total)

**Severity**: Informational (expected for internal-use app)

The Supabase linter reports 15 instances of "RLS Policy Always True" warnings. Based on the project's custom knowledge noting this is "used internally by trusted team members only" and handles "non-sensitive demo data," these permissive policies are acceptable for the current use case.

---

## Summary

| Category | Issue | Severity | Files Affected |
|----------|-------|----------|----------------|
| Bug | Missing forwardRef | Medium | ChampionsHeroCard.tsx |
| Dead Code | Unused import | Low | HeroCardsTab.tsx |
| Dead Code | Unused state | Low | useFormStateManager.ts |
| Dead Code | Unused parameter | Low | useBracketForm.ts |
| Security | Permissive RLS | Info | Database policies |

---

## Technical Implementation

### Fix 1: ChampionCardCompact forwardRef

Convert the component to use `React.forwardRef`:

```typescript
const ChampionCardCompact = React.forwardRef<
  HTMLDivElement,
  {
    team: TeamData;
    division: string;
    isWinter?: boolean;
  }
>(({ team, division, isWinter }, ref) => {
  return (
    <motion.div
      ref={ref}
      whileTap={{ scale: 0.97 }}
      // ... rest of component
    />
  );
});
ChampionCardCompact.displayName = 'ChampionCardCompact';
```

### Fix 2: Remove unused import in HeroCardsTab.tsx

```typescript
// Before
import { useAllHeroCards, useHeroCardMutations } from '@/hooks/useHeroCards';

// After
import { useAllHeroCards } from '@/hooks/useHeroCards';
```

### Fix 3: Remove unused state in useFormStateManager.ts

Remove lines 31 and 50/54 that set `isSaving`, or expose it if needed.

### Fix 4: Remove unused parameter in useBracketForm.ts

```typescript
// Before
interface UseBracketFormProps {
  teams: Team[];
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
}

// After
interface UseBracketFormProps {
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
}
```

Note: This will require updating the test file that passes `teams` to the hook.

---

## No Build Errors Found

The codebase has no TypeScript compilation errors. The test suite (45 test files with 100% pass rate per project memory) remains stable. All identified issues are quality improvements rather than breaking bugs.

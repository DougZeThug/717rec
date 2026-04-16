

## Plan: Prevent Double-Click Duplicate Match Creation

### The problem

`useMatchCreation` has no guard against concurrent calls, unlike `useMatchUpdate` which has `isUpdating` + a ref guard. Double-clicking "Create Match" fires two requests. Additionally, `handleSubmitForm` in `MatchFormRHF` doesn't return/await the `onSubmit` promise, so RHF's `isSubmitting` resets immediately.

### The fix

**3 files changed:**

**1. `src/hooks/useMatchCreation.ts`** — Add `isCreating` state + ref guard (mirroring `useMatchUpdate`):
- Add `const [isCreating, setIsCreating] = useState(false)` and `const isCreatingRef = useRef(false)`
- Guard `handleCreateMatch` with `if (isCreatingRef.current) return false`
- Wrap body in `try/finally` setting the ref and state
- Return `isCreating` from the hook

**2. `src/hooks/useMatchManagement.ts`** — Thread `isCreating` through to consumers.

**3. `src/components/schedule/MatchFormRHF.tsx`** — Add `isCreating` prop to disabled condition on submit button:
- Update `MatchFormProps` in `types.ts` to include `isCreating?: boolean`
- Add `isCreating` to the button's `disabled` check

**4. `src/components/schedule/MatchFormDialog.tsx`** — Pass `isCreating` prop through to `MatchFormRHF`.

**5. `src/pages/Schedule.tsx`** — Pass `isCreating` from `useMatchManagement` to `MatchFormDialog`.

**6. `src/components/schedule/types.ts`** — Add `isCreating?: boolean` to `MatchFormProps`.

### Runtime error

There's also a "Rendered more hooks" error in `useAuth`/`useAuthProfile` that appears to be a hot-reload artifact from our previous edit adding `useRef`+`useEffect`. I'll verify and fix if needed.

### What changes

- **4-6 files** — add `isCreating` guard and thread it to the submit button
- **0 migrations**


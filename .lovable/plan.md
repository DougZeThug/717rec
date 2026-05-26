## Bug: TeamForm data corruption when switching teams without unmounting

### Problem
`TeamForm` initializes `useState`, `useRef`, and React Hook Form `defaultValues` from the `team` prop only on mount. In `TeamsContainer`, switching `teamToEdit` from Team A to Team B keeps `TeamEditForm` mounted (truthy conditional), so the component re-renders with new props but stale internal state.

**Impact:** Team A's data is submitted under Team B's ID, causing data corruption.

### Fix
1. **TeamsContainer.tsx** — Add `key={teamToEdit.id}` to the `<TeamEditForm>` element. This forces React to unmount/remount the form when the team changes, ensuring fresh state.
2. **TeamActionsForms.test.tsx** — Add a test that renders `TeamEditForm` with Team A, then re-renders with Team B (same component instance, new props), and asserts the form reflects Team B's values and submits Team B's data.

### Verification
- Run existing test suite: `npm run test:file -- src/components/teams/__tests__/TeamActionsForms.test.tsx`
- New test should pass, confirming the `key` prop prevents stale state.

### Files changed
- `src/components/teams/TeamsContainer.tsx` (1-line addition)
- `src/components/teams/__tests__/TeamActionsForms.test.tsx` (new test case)

## Fix: Timeslot team selection crash in Admin Dashboard

### What I found
This issue looks valid.

The crash is most likely coming from `src/components/timeslots/TimeslotAssignment.tsx` when you tap/click a team in the selection grid.

Two strong clues point to the same spot:

1. Your production error is React error `#185`, which decodes to a repeated update loop.
2. The current team tile is a clickable `<button>` that contains a controlled Radix `<Checkbox>` inside it.

That combination is risky here because:
- the parent button changes `selectedTeamIds`
- the checkbox is also controlled by that same state
- Radix Checkbox has known edge cases around controlled usage inside forms/parent click handling
- nested interactive elements (`button` containing checkbox) can also create bad event/ref behavior

### Root cause
In `TimeslotAssignment.tsx`, each team card currently does this:

- outer clickable `<button>`
- inner `<Checkbox checked={isSelected} ... />`

When selection changes, the checkbox re-renders from parent state inside a clickable form control wrapper. That is the most likely source of the infinite update cycle and the Admin Dashboard route crash.

### Minimal safe fix
Keep the same layout and behavior, but remove the problematic interactive nesting.

#### File to update
`src/components/timeslots/TimeslotAssignment.tsx`

#### Change
Replace the team tile from:
- clickable `<button>`
- inner controlled `<Checkbox>`

with:
- non-form wrapper like `<div>` or `<label>`
- one explicit click handler on the wrapper
- checkbox shown as visual state only, or replace it with a plain check icon / styled selected indicator
- if keeping `Checkbox`, make it non-interactive and avoid parent+checkbox competing events

### Recommended implementation
Use the same pattern already seen in other list UIs, but avoid nesting a Radix checkbox inside a button.

Best minimal version:
- change the outer team tile from `<button type="button">` to `<div role="button" tabIndex={0}>`
- keep `onClick={() => handleToggleTeam(team.id)}`
- add keyboard support for Enter/Space
- replace the current `<Checkbox>` with a simple visual selected indicator, or keep it purely decorative and non-focusable

This preserves:
- same text
- same colors/styles
- same selection behavior
- same mobile layout

### Why this is the safest fix
It only touches the team picker interaction in one component.
It does not change:
- services
- hooks
- query logic
- mutation logic
- timeslot assignment rules
- page copy

So it is a small, targeted UI stability fix.

### Secondary cleanup I noticed
`src/pages/Timeslots.tsx` still imports `ByeWeekService` directly, which breaks your Components → Hooks → Services rule. That is separate from this crash and should not be mixed into this fix unless you want a second small refactor afterward.

### Files involved
- `src/components/timeslots/TimeslotAssignment.tsx` — actual crash fix
- `src/components/admin/timeslots/TimeslotsTab.tsx` — no likely change needed, but this is the caller
- `src/pages/Timeslots.tsx` — unrelated architecture cleanup opportunity, not required for this bug

### How I would verify after implementing
1. Open Admin Dashboard → Timeslots
2. Tap/click several teams in the team grid
3. Confirm selection count updates normally
4. Confirm no route crash / error boundary
5. Submit a normal timeslot assignment
6. Submit a BYE assignment
7. Check mobile and desktop team selection behavior

### Technical details
The current risky block is the team card section around:
- `src/components/timeslots/TimeslotAssignment.tsx:219-240`

It currently renders roughly:
```tsx
<button onClick={() => handleToggleTeam(team.id)}>
  ...
  <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
</button>
```

Even with `pointer-events-none`, the checkbox is still controlled and mounted inside a parent interactive button within a form. Given the React 185 error and known Radix checkbox loop issues, this is the most likely failure point.

### Proposed scope
One-file fix only:
- `src/components/timeslots/TimeslotAssignment.tsx`

No copy changes. No style redesign. Just stabilize the team selection interaction.

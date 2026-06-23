## Fix

In `src/components/admin/MassScoreEntryTool.tsx` line 99, `const filterTags = []` is inferred by TypeScript as `never[]`, so the subsequent `filterTags.push({ label, value })` calls fail with TS2345 ("not assignable to never").

Change the declaration to give the array an explicit element type:

```ts
const filterTags: { label: string; value: string }[] = [];
```

That's the only change needed for the two reported errors at lines 102 and 111. No behavior change, no other files touched.

Note: the sibling file `src/components/admin/mass-score-entry/MassScoreEntryTool.tsx` already avoids this issue by building the array inside a `useMemo` where inference works correctly — no change needed there.

## Problem

Commit `11eef1f8` migrated hand-rolled skeleton loaders to the shared `Skeleton` primitive. The new primitive hardcodes `bg-muted` (100% opacity) in `src/components/ui/skeleton-base.ts`. During migration, components that previously used contextual opacities (`bg-muted/20`, `bg-muted/50`) lost those overrides, so skeletons are now darker than the loaded content they represent.

## Affected components

Verified by diffing commit `11eef1f8`:

1. `src/components/matches/reactions/MatchReactions.tsx` — was `bg-muted/20`
2. `src/components/message-board/reactions/MessageReactions.tsx` — was `bg-muted/20` (same pattern, same commit)
3. `src/components/history/SeasonAccordionSummary.tsx` — was `bg-muted/50`
4. `src/components/matches/comments/MatchComments.tsx` — second skeleton was `bg-muted/50`

## Proposed changes

Add opacity overrides back via `className` on the affected `Skeleton` instances. `cn` / tailwind-merge resolves `bg-muted/20` and `bg-muted/50` as overrides of the base `bg-muted`.

```tsx
// MatchReactions.tsx
<Skeleton className="size-6 rounded-full bg-muted/20" />

// MessageReactions.tsx
<Skeleton className="size-6 rounded-full bg-muted/20" />

// SeasonAccordionSummary.tsx (both skeletons)
<Skeleton className="flex-1 h-16 rounded-lg bg-muted/50" />
<Skeleton className="flex-1 h-16 rounded-lg bg-muted/50" />

// MatchComments.tsx (second skeleton only)
<Skeleton className="h-8 w-full" />
<Skeleton className="h-20 w-full bg-muted/50" />
```

## Verification

- Run TypeScript type check (`npx tsc --noEmit`)
- Run relevant component tests if they exist:
  - `MatchReactions`, `MessageReactions`, `SeasonAccordionSummary`, `MatchComments`
- Visually confirm in preview that skeletons match the loaded content background tones

## Scope

No new components, no design tokens changed, no backend work. Pure CSS opacity restoration on four skeleton call sites.
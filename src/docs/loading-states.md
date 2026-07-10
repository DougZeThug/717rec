# Loading States Guidelines

This document outlines the standardized approach to loading states across the application.

## Decision Tree

```
Is this a button/action state?
  → YES: Use Loader2 inline
  → NO: Is this a full page?
    → YES: Use a full-page Skeleton component
    → NO: Does the content have a known structure?
      → YES: Use matching Skeleton component
      → NO: Use LoadingState section variant
```

## Loading State Types

### 1. Full Page Loading
Use a full-page Skeleton component (e.g., `CardSkeleton` with appropriate sizing) for page-level loading.

```tsx
import { LoadingState } from "@/components/ui/loading-state";

// Section loading (default variant)
<LoadingState message="Loading data..." />

// Inline loading (for use within existing content)
<LoadingState variant="inline" size="sm" message="Loading..." />
```

### 2. Content Skeleton Loaders
Use content-shaped skeleton components for data sections and lists. These provide better perceived performance by showing the structure of upcoming content.

**Available Skeleton Components:**
- `ShimmerSkeleton` - Base skeleton with shimmer animation
- `AvatarSkeleton` - Circular avatar placeholder

**Component-specific Skeletons:**
- `FinalStandingsSkeleton` - Playoff final standings
- `TeamDayTimeslotSkeleton` - Inline timeslot badge
- `SeasonAccordionSkeleton` - History season content
- `SignupsListSkeleton` - Blind draw signups table
- `MatchesTableSkeleton` - Mass score entry table
- `MatchCardSkeleton` - Schedule match card
- `MessageItemSkeleton` - Message board item
- `TeamListSkeleton` - Teams list/grid

### 3. Button/Action Loading
Use `Loader2` from lucide-react for inline loading states during user actions.

```tsx
import { Loader2 } from "lucide-react";

<Button disabled={isLoading}>
  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
  Save
</Button>
```

## Best Practices

1. **Never use plain text "Loading..."** - Always provide a visual indicator
2. **Match skeleton structure to content** - Skeletons should closely match the final UI
3. **Use shimmer animation** - Provides visual feedback that content is loading
4. **Keep skeletons simple** - Don't over-detail; focus on layout structure
5. **Stagger animations** - For lists, use staggered delays for smoother appearance

## Examples

### ❌ Don't
```tsx
if (isLoading) return <div>Loading...</div>;
```

### ✅ Do
```tsx
import FinalStandingsSkeleton from "./FinalStandingsSkeleton";

if (isLoading) return <FinalStandingsSkeleton />;
```

### ❌ Don't (for data sections)
```tsx
if (isLoading) {
  return (
    <div className="flex justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
```

### ✅ Do
```tsx
import MatchesTableSkeleton from "./MatchesTableSkeleton";

if (isLoading) return <MatchesTableSkeleton />;
```

## Creating New Skeletons

When creating a skeleton for a new component:

1. Import `ShimmerSkeleton` and other utilities from `@/components/ui/shimmer-skeleton`
2. Match the component's layout structure
3. Use appropriate sizes and proportions
4. Add shimmer animation via the ShimmerSkeleton component
5. Place the skeleton file next to the component it represents

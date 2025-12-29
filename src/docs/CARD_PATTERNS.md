# Card Patterns Guide

## Component Hierarchy

1. **`Card`** - Base shadcn component for all card-like containers
2. **`SummaryCard`** - For stat/metric displays with icon, title, value
3. **`EntityCard`** - Wrapper for entity displays (teams, rankings) with motion
4. **`AppCard`** - High-level wrapper for navigable cards with title, description, badge

## When to Use Each

### Use `Card` (base component) for:
- Simple containers with custom content layout
- Loading states with centered spinners
- Empty states
- Admin panels and forms

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Settings</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Custom content */}
  </CardContent>
</Card>
```

### Use `SummaryCard` for:
- Key metric displays (win %, power score, SOS)
- Dashboard stat cards
- Summary information with icon + value + description

```tsx
import { SummaryCard } from "@/components/ui/summary-card";

<SummaryCard
  icon={Trophy}
  iconColor="text-amber-500"
  iconBgColor="bg-amber-500/15"
  title="Total Teams"
  value={42}
  description="Across all divisions"
  gradient="amber"
  index={0}
/>
```

### Use `EntityCard` for:
- Team display cards
- Ranking cards
- Any interactive entity that needs hover/tap animations
- Cards that support winter theme

```tsx
import { EntityCard } from "@/components/ui/entity-card";

<EntityCard division={team.divisionName} isInteractive>
  {/* Team content */}
</EntityCard>
```

### Use Tables for:
- Structured data with many columns
- Sortable data displays
- Rankings with multiple comparable metrics

---

## Card Style Checklist

All cards should have:
- [ ] Consistent border radius: use `rounded-lg` (default) or `rounded-xl` (summary)
- [ ] Consistent borders: `border border-border`
- [ ] Appropriate shadow: `shadow-sm` (default), `shadow-md` (elevated)
- [ ] Theme-aware colors using design system tokens
- [ ] Winter theme support via `useSeasonalTheme` hook
- [ ] Interactive feedback if clickable: hover scale + shadow

---

## Gradient Variants

Use gradients from the design system:

```tsx
import { cardPresets, cardGradients } from "@/styles/design-system/cards";

// Preset gradients
cardGradients.amber   // Amber summary card
cardGradients.green   // Green summary card
cardGradients.blue    // Blue summary card
cardGradients.purple  // Purple summary card
```

---

## Motion Animations

Use consistent card animations:

```tsx
import { cardAnimations } from "@/styles/design-system/cards";

<motion.div
  whileHover={cardAnimations.hover}
  whileTap={cardAnimations.tap}
>
```

---

## Winter Theme Support

Cards must check for winter theme and apply appropriate styles:

```tsx
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";

const { isWinterTheme } = useSeasonalTheme();

<div className={cn(
  "rounded-lg border",
  isWinterTheme 
    ? "winter-card-surface border-frost-border/30" 
    : "bg-card border-border"
)}>
```

---

## List Layout Utilities

Use consistent grid/stack layouts from the design system:

```tsx
import { listStyles } from "@/styles/design-system/lists";

// Responsive grid
<div className={listStyles.grid.responsive}>

// Two column grid
<div className={listStyles.grid.twoColumn}>

// Vertical stack
<div className={listStyles.stack.default}>
```

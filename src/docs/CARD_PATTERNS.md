# Card Patterns Guide

> Building a **table** that becomes cards on a phone? Use `ResponsiveTable` —
> see `src/docs/TABLE_PATTERNS.md`. It is built on the `Card` below.

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
- [ ] Colour from tokens: `bg-card`, `text-card-foreground`, `text-muted-foreground`,
      `border-border`. No `dark:` twin — each theme sets the token to its own value
- [ ] Winter surface effects (frost, icicles) via `useSeasonalTheme` hook
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

## Colour, and winter

**Colour needs no branch.** `bg-card`, `text-card-foreground` and `border-border`
are tokens, and all three themes — light, dark and winter — set them to their own
values (`src/styles/theme.css` and `src/styles/themes/winter-homepage.css`). Write
the token once:

```tsx
<div className="rounded-lg border border-border bg-card text-card-foreground">
```

Do **not** write the colour twice by hand. `text-gray-600 dark:text-gray-400` is
wrong twice over: it says the colour instead of the role, and the `dark:` half
does nothing under the winter theme, whose class is `winter-frozen`, not `dark`.
`CONTRIBUTING.md` → Styling is the rule; `npm run lint` enforces it.

**Winter needs a branch only for its surface effects** — the frosted glass and
the frost edge, which are decoration rather than colour:

```tsx
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";

const { isWinterTheme } = useSeasonalTheme();

<div className={cn(
  "rounded-lg border border-border bg-card text-card-foreground",
  isWinterTheme && "winter-card-surface frost-edge"
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

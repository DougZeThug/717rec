

## Tighten History Page Mobile Layout

### Problem

Comparing the reference screenshot to the current implementation, there's excessive whitespace from multiple sources:

1. **DivisionPanel**: `space-y-3 pb-6` with thick border-bottom separators between divisions
2. **Expanded season content**: `space-y-6` and `gap-6` between division panels
3. **Division headers**: Oversized padding (`px-4 py-3`) and large chevron button
4. **Season accordion outer card**: `rounded-2xl` with `p-4 md:p-6` expanded content padding
5. **HistoryPageContent**: `space-y-4` gap between season accordions
6. **Page-level**: PageHeader takes vertical space that could be reclaimed on mobile

### Changes

**1. `src/components/history/DivisionPanel.tsx`** — Compact mobile spacing

- Reduce `space-y-3 pb-6` to `space-y-1.5 pb-3 md:space-y-3 md:pb-6`
- Reduce division header padding from `px-4 py-3` to `px-3 py-2 md:px-4 md:py-3`
- Reduce header text from `text-lg` to `text-base md:text-lg`
- Shrink chevron button from `h-8 w-8` to `h-6 w-6 md:h-8 md:w-8`
- Remove the thick `border-b` separator on mobile, keep on desktop

**2. `src/components/history/SeasonAccordion.tsx`** — Tighter expanded content

- Reduce expanded content padding from `p-4` to `p-3 md:p-4 md:p-6`
- Reduce division grid gap from `gap-6` to `gap-3 md:gap-6`
- Reduce `space-y-6` to `space-y-3 md:space-y-6` in the expanded content wrapper

**3. `src/components/history/HistoryPageContent.tsx`** — Tighter accordion gaps

- Reduce `space-y-4` to `space-y-2 md:space-y-4` between season accordions

**4. `src/pages/History.tsx`** — Hide page description on mobile

- Add mobile-only class to hide the PageHeader description text, or reduce the gap between header and content

### Scope

4 files — spacing/padding CSS changes only. No logic or data changes.


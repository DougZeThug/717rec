

## Enhance Compact/Detailed Toggle Selection Indicator

### Problem

Both Current Standings and Career Statistics use identical `ToggleGroup` components with `bg-cornhole-navy text-white shadow-sm` for the active state. On dark backgrounds, this doesn't stand out enough to clearly show which option is selected.

### Solution

Add a glowing ring effect to the active toggle using a `ring` + `ring-offset` + a subtle blue glow via `shadow` on the selected item. This creates a visible "lit up" indicator that contrasts well against the dark UI.

### Changes

**1. `src/components/stats/RankingsMobileView.tsx`** (lines 180-196)

Update the active toggle class from:
```
bg-cornhole-navy text-white shadow-sm
```
to:
```
bg-cornhole-navy text-white ring-2 ring-blue-400/70 ring-offset-1 ring-offset-background shadow-[0_0_8px_rgba(96,165,250,0.5)]
```

**2. `src/components/stats/career/CareerRankingsMobileView.tsx`** (lines 92-107)

Same change — identical toggle markup gets the same glow treatment.

### What it looks like

The selected toggle gets a soft blue glowing ring around it, making it unmistakably active. The unselected toggle remains unchanged (muted text, no ring).

### Scope

2 files, CSS class changes only. No logic changes.



## Fix Bottom Nav Being Clipped on Mobile Scroll

### Problem
On Android Chrome, when swiping down, the browser's system navigation bar overlaps the bottom navbar, clipping the labels ("Standings", "Schedule", "Teams"). The current `env(safe-area-inset-bottom)` padding only handles iOS safe areas, not Android's dynamic browser chrome.

### Solution
Two small changes in `src/components/navigation/BottomNav.tsx`:

1. Add extra bottom padding to the nav container so labels aren't clipped by the system bar -- increase `pb-[env(safe-area-inset-bottom,0px)]` to include a minimum fallback (e.g., `pb-[max(env(safe-area-inset-bottom,0px),12px)]` or a simple additional `pb-3`)
2. Ensure the inner container height accommodates the labels fully by keeping `h-16` but adding a small bottom margin/padding

### Technical Detail

**File: `src/components/navigation/BottomNav.tsx`**

- Change the nav's padding from `pb-[env(safe-area-inset-bottom,0px)]` to `pb-[calc(env(safe-area-inset-bottom,0px)+12px)]` -- this adds 12px of breathing room below the nav items on all devices, while still respecting iOS safe areas additively
- This ensures the text labels are never clipped by the Android system navigation bar

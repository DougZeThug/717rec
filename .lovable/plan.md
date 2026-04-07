

## Fix: iOS Safari Navigation Freezing

### Root Cause Analysis

After examining the codebase, I identified **three compounding issues** that together cause iOS Safari to drop touch/click events after a few interactions:

### Problem 1: `overflow-x: hidden` on `<html>` element (HIGH — primary suspect)

**File:** `src/styles/base.css` line 18

This is a **well-documented iOS Safari bug**. When `overflow-x: hidden` is set on the `<html>` element, Safari's scroll/touch event handling becomes unreliable — it can "swallow" touch events after a few interactions, especially after page transitions or scroll position changes. The `<body>` having it too (line 26) is fine, but on `<html>` it's the trigger.

**Fix:** Remove `overflow-x: hidden` from the `html` rule. Keep it on `body` only.

### Problem 2: `backdrop-blur-lg` on fixed BottomNav (MEDIUM — amplifier)

**File:** `src/components/navigation/BottomNav.tsx` line 55

`backdrop-filter: blur()` on a `position: fixed` element forces iOS Safari's compositor to re-composite the entire viewport on every frame during scrolling and interactions. When combined with other rendering work (framer-motion animations, page transitions), this can stall the main thread enough to drop touch events.

**Fix:** Replace `backdrop-blur-lg` with a solid opaque background. Use `bg-background` (fully opaque) instead of `bg-background/80 backdrop-blur-lg`. The visual difference is minimal on a phone screen, but the performance gain is significant.

### Problem 3: Framer-motion animations on every NavItem tap (LOW — contributor)

**File:** `src/components/navigation/NavItem.tsx` lines 70-82, 96-113

Every bottom nav tap triggers:
- A `motion.div` scale animation on the icon (lines 78-79)
- An `AnimatePresence` enter/exit animation on the active indicator bar (lines 96-113)

These are JS-driven animations that run on the main thread. On iOS Safari, when the compositor is already stressed (backdrop-blur), these additional main-thread animations can cause touch events to be missed.

**Fix:** Replace framer-motion animations with CSS transitions. Use CSS `transform` transitions for the icon scale and CSS `scaleX` transitions for the indicator bar. This moves the work to the GPU compositor, off the main thread.

### Changes Summary

| File | Change |
|------|--------|
| `src/styles/base.css` | Remove `overflow-x: hidden` from `html` rule |
| `src/components/navigation/BottomNav.tsx` | Replace `backdrop-blur-lg` with opaque background |
| `src/components/navigation/NavItem.tsx` | Replace framer-motion with CSS transitions |

### Why this should fix it

The freeze pattern described — "works for a few taps, then stops responding, but scrolling still works" — is the signature of iOS Safari's compositor becoming overwhelmed. Touch events are processed by the compositor thread first, then forwarded to the main thread. When the compositor is busy (backdrop-blur recompositing) and the main thread is busy (framer-motion JS animations), the event queue backs up and Safari drops events.

Removing these three pressure points should eliminate the freeze entirely.


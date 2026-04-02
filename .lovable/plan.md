

## Fix: Collapsible Sections Not Opening on iPhone Safari

### Analysis

The `CollapsibleSection` component wraps its `setIsOpen` state update inside React's `startTransition()`:

```tsx
const handleOpenChange = (open: boolean) => {
  startTransition(() => {
    setIsOpen(open);
  });
};
```

`startTransition` marks the update as non-urgent, which tells React it can be deferred. On iOS Safari, this can cause the state update to appear to never fire -- the section never opens because Safari's rendering pipeline deprioritizes or drops the transition update, especially when combined with backdrop-blur effects from the sticky nav and any ongoing animations.

This is a known pain point with `useTransition` on Safari/WebKit where low-priority updates get swallowed during touch interactions.

### Fix

**File: `src/components/ui/CollapsibleSection.tsx`**

1. Remove `useTransition` from imports and usage
2. Change `handleOpenChange` to call `setIsOpen` directly:

```tsx
const handleOpenChange = (open: boolean) => {
  setIsOpen(open);
};
```

This is safe because opening/closing a section is a fast, lightweight state change -- there's no heavy rendering that would benefit from transition deprioritization. The children are already mounted lazily by Radix's CollapsibleContent.

### Scope

One file, one change. No visual or behavioral differences on other browsers. Sections will reliably respond to taps on iOS Safari.


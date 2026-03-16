

## Fix: Safari Freezing on Team Pages & H2H Sections

### Root Cause

The CSS rule in `src/styles/utilities.css` (line 123):
```css
section:not(:first-of-type) {
  content-visibility: auto;
  contain-intrinsic-size: auto 400px;
}
```

This applies `content-visibility: auto` to **every non-first `<section>` element** across the entire app. The TeamDetails page has 6 `<section>` elements — the H2H section (`#h2h`), match history, career stats, and achievements all get `content-visibility: auto`.

Safari's `content-visibility` implementation is buggy. When Safari determines a section is "off-screen," it skips rendering **and suppresses pointer events**. When users scroll to the H2H section or try to expand collapsibles, Safari may still consider those sections as off-screen (especially after navigation or dynamic content loading), making them completely unresponsive. This matches the reported behavior: "randomly stops opening tabs" and "not allow the user to do anything."

The previous fix removed `contain: paint` from explicit inline styles but missed this global CSS rule that blanket-applies `content-visibility: auto` to all sections.

### Changes

**File: `src/styles/utilities.css` (lines 122-126)**
- Remove the `section:not(:first-of-type)` rule entirely. This global selector is too aggressive — it applies containment to sections that have dynamic/interactive content (collapsibles, modals, lazy-loaded data). The `.content-auto` utility class (lines 117-120) remains available for explicitly opting in specific elements where it's safe.


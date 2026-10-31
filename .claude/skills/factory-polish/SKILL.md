---
name: factory-polish
description: Evaluate and improve one screen or feature (layout, spacing, phone usability, empty and error states, accessibility) without redesigning it. Captures before and after screenshots at phone and desktop width. Use for "make X nicer", "X looks off on my phone".
argument-hint: "<screen, route or feature>"
disable-model-invocation: true
---

# /factory-polish

Target: **$ARGUMENTS**

1. Read `factory/PIPELINE.md`. Task `--kind polish`. Read the design rules in the project context files. **Keep the established design.** No new visual language, no layout rewrite.
2. Start the app (`preview.command` in `.factory/config.json`). Capture **before** screenshots: `node factory/bin/shoot.mjs --out .factory/evidence/<id>/before --routes <paths>`. Look at them.
3. Spawn `factory-ux` to audit the target and list concrete defects (alignment, overflow, tap targets under 44px, contrast, missing empty/loading/error states, focus order). Rank them. Fix only the ones that clearly help; list the rest as "left alone".
4. Criteria: each fixed defect has a before/after pair, no new console errors, no sideways scroll, existing tests still pass.
5. Capture **after** screenshots to `.factory/evidence/<id>/after`. Compare with the before shots yourself. Reject your own change if something else moved.
6. Run Stages 6, 8, 9 (verify, independent review, gate). Report with the screenshot paths.

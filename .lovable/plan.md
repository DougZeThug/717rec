

## Tighten History Page Collapsed Accordion on Mobile

### What's changing

The collapsed season accordion headers currently have a large trophy icon circle (40x40), generous padding, and spread-out metadata. The reference screenshot shows a much tighter layout: season name + date inline, team/match count below, status badge right-aligned — all compact.

### Changes

**`src/components/history/SeasonAccordion.tsx`** — Collapsed header redesign (mobile only)

**Current layout (lines 149-253):**
```text
┌─────────────────────────────────────────┐
│ [40px trophy circle]  WINTER 1 2026     │  ← large icon, generous p-4
│                       (Jan - Feb 2026)  │
│                       👑 Cuzzo's Clinic  │
│                       👥 19 teams  📅 193│
│                                      ∨  │
└─────────────────────────────────────────┘
```

**New layout:**
```text
┌─────────────────────────────────────────┐
│ WINTER 1 2026 (Jan - Feb 2026)  🏆 Done │  ← no circle icon, tighter
│ 👑 Cuzzo's Clinic                       │
│ 19 teams · 193 matches              ∨  │
└─────────────────────────────────────────┘
```

Key changes:
1. **Remove the 40px trophy circle** on mobile — it takes too much horizontal space. Keep it on desktop via `hidden md:flex`.
2. **Reduce padding** from `p-4` to `px-3 py-3 md:p-6` on the button.
3. **Inline the status badge** (Active / Completed with trophy icon) on the right side of the first row, next to the season name and date.
4. **Move champion names** to their own compact line directly under the title (no icons, just `👑 Name`).
5. **Combine team count + match count** into a single line: `19 teams · 193 matches`.
6. **Reduce gap** between metadata items from `gap-3` to `gap-1.5` on mobile.
7. **Smaller chevron** area — keep it right-aligned but tighter.

For non-active completed seasons, show a small `🏆 Completed` badge (or `Active Season` for active) — matching the reference screenshot's right-aligned status indicators.

### Scope

1 file: `src/components/history/SeasonAccordion.tsx` — collapsed header layout only. No data, logic, or expanded content changes. Team cards inside remain untouched.


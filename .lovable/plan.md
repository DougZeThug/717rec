

## Change: Dark Default + Click-to-Toggle Theme

### What changes

1. **Default theme → dark** instead of system (`src/main.tsx`)
2. **Remove "system" from theme options** (`src/components/ui/theme/ThemeToggle.tsx`)
3. **Replace dropdown with click-to-cycle** — single click cycles through enabled themes (light → dark, or light → dark → winter if enabled). No dropdown menu needed.
4. **Remove system from admin theme management** (`src/components/admin/theme/ThemeManagementTab.tsx`) — remove it from the selectable options since it's no longer offered
5. **Update fallback in auto-switch** — if current theme becomes disabled, fall back to `'dark'` instead of first enabled key

### Files to edit

- **`src/main.tsx`** — change `defaultTheme="system"` to `"dark"`, remove `'system'` from themes array
- **`src/components/ui/theme/ThemeToggle.tsx`** — replace DropdownMenu with a simple Button that cycles themes on click. Remove system option from `allThemeOptions`. Remove dropdown imports.
- **`src/components/admin/theme/ThemeManagementTab.tsx`** — no code change needed (admin DB controls which themes show; system row can stay in DB harmlessly or be removed via migration)
- **`src/hooks/useThemeConsistency.ts`** — change fallback default from `'system'` to `'dark'`


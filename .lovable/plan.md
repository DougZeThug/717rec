

## Remove Winter Theme & Add Admin Theme Management

### Overview
Remove the winter theme from user-facing theme options (winter is over) and add an admin tab to control which themes are available to users. Theme availability settings will be stored in a new Supabase table.

### Database Changes
Create a `theme_settings` table to store which themes are enabled:

```sql
CREATE TABLE public.theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_key text NOT NULL UNIQUE,
  label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read theme settings (needed for ThemeToggle)
CREATE POLICY "Public can view theme settings"
  ON public.theme_settings FOR SELECT TO public
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can update theme settings"
  ON public.theme_settings FOR UPDATE TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Seed with all themes, winter disabled by default
INSERT INTO public.theme_settings (theme_key, label, is_enabled, sort_order) VALUES
  ('light', 'Light', true, 0),
  ('dark', 'Dark', true, 1),
  ('system', 'System', true, 2),
  ('winter-frozen', 'Winter', false, 3);
```

### Code Changes

**1. New hook: `src/hooks/useThemeSettings.ts`**
- Fetches enabled themes from `theme_settings` table
- Caches with React Query
- Returns list of enabled theme keys

**2. Update `ThemeToggle.tsx`**
- Use `useThemeSettings` to filter `themeOptions` to only show enabled themes
- If user's current theme becomes disabled, auto-switch to `light`

**3. New admin tab: `src/components/admin/theme/ThemeManagementTab.tsx`**
- Simple toggle list showing all themes with on/off switches
- Updates `theme_settings` table on toggle
- Shows theme name, current status

**4. Register in `AdminSidebar.tsx` and `AdminMobileNav.tsx`**
- Add "Themes" tab with `Palette` icon between "Hero" and "Blind Draw"

**5. Update `useThemeConsistency.ts`**
- Remove the winter migration logic (no longer needed)
- Default to `light` instead of `winter-frozen`

**6. Update `main.tsx`**
- Change `defaultTheme` from `winter-frozen` to `light`
- Keep `winter-frozen` in the `themes` array (still a valid theme, just admin-disabled)

**7. Update `src/config/features.ts`**
- `ENABLE_WINTER_THEME` stays `false` (consistent with admin setting)




## Add Champions Editor to Admin Hero Card Form

### Problem
When editing a "champions" type hero card, the admin has no UI to select which team won each division. The `metadata.champions` field (a `Record<divisionName, teamId>`) must be edited as raw JSON. The number of divisions varies (3-4 visible divisions per season).

### Approach
Create a new `ChampionsEditor` form section that appears when `card_type === 'champions'`. It dynamically fetches divisions and teams, letting the admin pick a champion team per division.

### Changes

#### 1. New file: `src/components/admin/hero-cards/form-sections/ChampionsEditor.tsx`
- Fetch all divisions (excluding "Hidden" display divisions) via Supabase query, ordered by `division_weight` DESC
- Group by `display_division` (since multiple internal divisions map to one display division like "Competitive", "Intermediate", "Recreational")
- For each unique display division, show a Select dropdown populated with all non-hidden teams
- Read current selections from `metadata.champions` (parsed from the JSON string in formData)
- On selection change, update `metadata.champions` in the form data
- Include a "Clear" option to remove a division's champion
- Uses the same `FormSectionProps` pattern as other sections, with `SectionHeader` using a Trophy icon

#### 2. Update `src/components/admin/hero-cards/form-sections/index.ts`
- Export `ChampionsEditor`

#### 3. Update `src/components/admin/hero-cards/HeroCardForm.tsx`
- Import `ChampionsEditor`
- Render `<ChampionsEditor>` when `formData.card_type === 'champions'` (similar to how `EventWinnersEditor` shows for event type)

### Data Flow
- Divisions query: `SELECT DISTINCT display_division, division_weight FROM divisions WHERE display_division != 'Hidden' ORDER BY division_weight DESC`
- Teams query: `SELECT id, name FROM teams WHERE division_id NOT IN (hidden division ids) ORDER BY name`
- Stored as `metadata.champions`: `{ "Competitive": "team-uuid", "Intermediate": "team-uuid", "Recreational": "team-uuid" }`
- The existing `ChampionsHeroCard` component already reads this format — no rendering changes needed

### Files Modified
- `src/components/admin/hero-cards/form-sections/ChampionsEditor.tsx` (new)
- `src/components/admin/hero-cards/form-sections/index.ts`
- `src/components/admin/hero-cards/HeroCardForm.tsx`


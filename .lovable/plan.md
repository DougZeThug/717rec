

## Plan: Fix EventHeroCard to use admin-editable fields + add Event Settings UI in admin form

### Problem
1. When `metadata.is_active_event` is false (or absent), the EventHeroCard hardcodes the title to "Blind Draw Results" and hides `card.subtitle` and `card.body` entirely
2. The `is_active_event` toggle is buried in raw JSON metadata with no dedicated UI control
3. Past winners are stored in raw JSON metadata with no structured editor -- admins must hand-edit JSON

### Changes

#### 1. `src/components/hero/EventHeroCard.tsx` -- Use admin fields in both states

- **Line 192**: Replace `{isActiveEvent ? card.title : 'Blind Draw Results'}` with `{card.title}`
- **Lines 203-216**: Show subtitle in both active and inactive states. When inactive, show `card.subtitle` if set. When active, show `card.subtitle || formatDate(checkInTimeStr)`.
- **After line 430 (past winners section)**: Render `card.body` when present, in both states

#### 2. `src/components/admin/hero-cards/form-sections/TargetingDisplaySection.tsx` -- Add event active toggle

Add a new toggle "Event Active" that only appears when `card_type === 'event'`. This toggle controls `metadata.is_active_event` by parsing/updating the metadata JSON string in form state. This avoids requiring admins to edit raw JSON.

#### 3. New file: `src/components/admin/hero-cards/form-sections/EventWinnersEditor.tsx`

A dedicated UI for managing `metadata.past_winners`. This component:
- Displays a list of weeks with their winners (place + names)
- Allows adding/removing weeks
- Allows adding/removing winners within each week
- Reads from and writes to the `metadata` JSON string in form state
- Only shown when `card_type === 'event'`

#### 4. `src/components/admin/hero-cards/HeroCardForm.tsx` -- Add EventWinnersEditor

Import and render the `EventWinnersEditor` component between TargetingDisplaySection and AdvancedSettingsSection, conditionally shown when `formData.card_type === 'event'`.

### Technical Details

**Event active toggle approach**: Rather than adding a separate form field, the toggle will parse `formData.metadata` (JSON string), set/unset `is_active_event`, and call `onChange('metadata', updatedJsonString)`. This keeps the metadata field as the single source of truth.

**Winners editor approach**: Same pattern -- parse `formData.metadata`, extract `past_winners` array, provide structured inputs, serialize back to JSON on change. Each week entry has a week number input and 1-3 winner rows (place auto-assigned, names as text input).

### Files Modified
- `src/components/hero/EventHeroCard.tsx` -- use `card.title` always, show subtitle/body in inactive state
- `src/components/admin/hero-cards/form-sections/TargetingDisplaySection.tsx` -- add "Event Active" toggle for event cards
- `src/components/admin/hero-cards/form-sections/EventWinnersEditor.tsx` -- new structured winners editor
- `src/components/admin/hero-cards/form-sections/index.ts` -- export new component
- `src/components/admin/hero-cards/HeroCardForm.tsx` -- render EventWinnersEditor for event cards


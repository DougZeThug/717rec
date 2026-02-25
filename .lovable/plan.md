

## Plan: Add Event Settings (times, buy-in, payouts) to Hero Card Admin Form

### Problem

The `EventHeroCard` relies on several metadata fields to render the signup form and event details:
- `metadata.start_time` — used to derive `eventDate` for the signup form, and for the start countdown
- `metadata.check_in_time` — used for the check-in countdown
- `metadata.buy_in` — displayed in the event details grid
- `metadata.payouts` — displayed in the event details grid
- `metadata.is_active_event` — gates the signup form, countdowns, and event details (toggle already added)

Currently, `start_time`, `check_in_time`, `buy_in`, and `payouts` can only be edited via raw JSON in the Advanced Settings section. Without `start_time` set, the signup form never renders because `eventDate` is null (line 477: `isActiveEvent && card.slug === 'blind-draw' && eventDate`). There is no structured UI for these fields, so admins have no obvious way to configure the blind draw signup from the hero card editor.

### Changes

#### 1. `src/components/admin/hero-cards/form-sections/TargetingDisplaySection.tsx` — Add event metadata fields

When `card_type === 'event'`, add structured inputs below the "Event Active" toggle:

- **Check-in Time** — `datetime-local` input, reads/writes `metadata.check_in_time` (ISO string)
- **Start Time** — `datetime-local` input, reads/writes `metadata.start_time` (ISO string)
- **Buy-in** — text input, reads/writes `metadata.buy_in` (e.g. "$10")
- **Payouts** — text input, reads/writes `metadata.payouts` (e.g. "Top 3")

Each field will use the same `parseMetadata` / `JSON.stringify` pattern already used by the `handleEventActiveToggle` function. The datetime-local inputs will convert to/from ISO strings.

### Technical Details

**datetime-local conversion:** HTML `datetime-local` inputs use the format `YYYY-MM-DDTHH:MM`. The metadata stores full ISO strings. On read, we slice the ISO string to the `YYYY-MM-DDTHH:MM` format. On write, we convert back by appending seconds and timezone info, or simply store the partial ISO string (the `new Date()` constructor handles both).

**Metadata as source of truth:** All four fields are read from and written to the `formData.metadata` JSON string, consistent with the existing `is_active_event` toggle pattern. No new form fields are added to `HeroCardFormData`.

### Files Modified
- `src/components/admin/hero-cards/form-sections/TargetingDisplaySection.tsx` — add check-in time, start time, buy-in, and payouts inputs for event cards


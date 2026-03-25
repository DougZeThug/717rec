

## Redesign Schedule Page for Visual Impact

The reference image shows a clean, dark-themed schedule with the 717REC branding, a compact date strip, search inline, and bold match cards with large logos, centered scores, H2H context, and prediction bars — all feeling premium and "app-like". Here's how to bring that energy to the current schedule while keeping all existing fields.

### Changes

**1. Compact header — `src/components/schedule/ScheduleHeader.tsx`**
- Remove the large "Schedule" title text — the bottom nav already identifies the page
- Keep the DateStrip and search, but lay them out more compactly: DateStrip on top, search + calendar icon inline below it (or search integrated into the date strip row)
- Tighter vertical spacing (`mt-1 mb-1`)

**2. Redesign DateStrip — `src/components/schedule/DateStrip.tsx`**
- Make selected date more prominent: larger number, bold colored background (primary with glow/shadow), slightly bigger pill shape
- Add a subtle indicator line or progress bar below the strip (like the teal bar in the reference)
- Dates with matches get an orange dot (already exists) — keep as-is

**3. Redesign MatchCard — `src/components/schedule/MatchCard.tsx`**
- **Layout shift**: Center-aligned vertical layout matching reference:
  - Top: Two large logos side-by-side with score between them (`Logo1  0 - 0  Logo2`)
  - Below logos: Team names centered under each logo
  - H2H line below (already exists, keep it — style with colored team name like reference: "Nemesis: **Team A** leads H2H **4-0**")
  - Prediction bar: Full-width gradient bar (team1 color to team2 color) with percentages on each end, "favored" text below
  - Bottom row: Comments count + "Join the Hype" interaction buttons (keep existing `MatchInteractions`)
- **Card styling**: Add a subtle gradient border (like the orange/teal glow in reference) using a wrapper div with gradient background + inner card with padding. Use `rounded-xl` for more modern feel
- Increase logo size to `lg` for visual impact
- Score pill: larger text (`text-3xl font-black`), keep the rounded pill background
- Remove the floating "Final" badge from top-left — instead show status inline or as a subtle top-center badge
- Keep all existing fields: countdown, prediction, H2H, admin buttons, upset tag

**4. Tighten ScheduleContent tabs — `src/components/schedule/ScheduleContent.tsx`**
- Reduce `mt-6` on TabsContent to `mt-3`
- Make tab triggers slightly more compact

**5. Update DateMatchGroup — `src/components/schedule/DateMatchGroup.tsx`**
- Slightly rounded header (`rounded-lg`)
- Reduce inner padding from `p-4` to `p-3`

**6. Update MatchPrediction — `src/components/schedule/MatchPrediction.tsx`**
- Replace the text-only prediction with a visual probability bar: a full-width rounded bar with team1's color filling from left and team2's color from right, percentages overlaid
- Keep the expandable "Why" breakdown
- Show "{team} favored" text below the bar

**7. Update MatchHeadToHead — `src/components/schedule/MatchHeadToHead.tsx`**
- Style the leading team name in a highlight color (like the reference: red for the leading team)
- Make the rivalry tag more prominent (bold, slightly larger)

### Files to edit
- `src/components/schedule/ScheduleHeader.tsx` — remove title, tighten spacing
- `src/components/schedule/DateStrip.tsx` — enhance selected state styling
- `src/components/schedule/MatchCard.tsx` — major layout redesign (centered logos/score, gradient border, larger elements)
- `src/components/schedule/ScheduleContent.tsx` — tighten tab spacing
- `src/components/schedule/DateMatchGroup.tsx` — minor spacing tweaks
- `src/components/schedule/MatchPrediction.tsx` — add visual probability bar
- `src/components/schedule/MatchHeadToHead.tsx` — colored team name highlight


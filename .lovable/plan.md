# Plan: Restore Bebas Neue for 717REC and headers

## What happened

- The app is using the winter theme.
- In the winter theme CSS, `.font-bebas` is overridden to use `OhSnow` first.
- The home page also swaps the `717Rec` title to `SnowtopText` when winter mode is active.
- This makes brand text and capitalized headers stop looking like Bebas Neue.

## Fix

1. Remove the winter-theme override that replaces `.font-bebas` with `OhSnow`.
2. Change the home page `717Rec` title so it uses the normal Bebas Neue title in winter mode too.
3. Leave winter colors, ice styling, and theme behavior in place.
4. Keep the special snow fonts available only for places that explicitly request them.

## Check

- Open the home page.
- Confirm `717Rec` uses Bebas Neue on desktop and mobile.
- Check page headers and team names that use uppercase display text.
- Run the focused safe checks after the edit.

## Technical details

Files to change:

- `src/styles/themes/winter-homepage.css`
- `src/components/home/HeroSection.tsx`

No database changes.
No package changes.

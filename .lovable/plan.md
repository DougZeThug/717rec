

## Update Nav Button Colors & Label

### Changes — `src/components/home/HeroSection.tsx`

1. **Rename** "League Standings" → "Standings"
2. **Recolor buttons** to use the app's navy/blue theme palette instead of rainbow colors:
   - **Standings**: `bg-cornhole-navy hover:bg-cornhole-navy/80` (navy — matches hero)
   - **Full Schedule**: `bg-blue-700 hover:bg-blue-800` (blue — matches primary)
   - **History**: `bg-slate-600 hover:bg-slate-700` (muted slate — subtle secondary)
   - **My Teams**: `bg-cornhole-navy/80 hover:bg-cornhole-navy` (lighter navy variant)

This keeps the buttons cohesive with the app's navy/blue brand rather than using unrelated green/violet/amber.

### Technical Details
- Single file edit: `src/components/home/HeroSection.tsx` lines 84-107
- Only the `className` prop and `label` prop change; no structural changes


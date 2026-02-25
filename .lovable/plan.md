

## Plan: Add Image Upload/Preview for Flyer Hero Cards

### Problem

The flyer card type relies entirely on `image_url` for its content, but:
1. The image URL field is buried in "Design & Appearance" labeled as "Background Image URL (optional)" — not obvious for flyer cards
2. There is no image preview in the form, so admins can't verify the image looks right
3. There is no way to upload an image directly — admins must manually paste a URL

### Changes

#### 1. `src/components/admin/hero-cards/form-sections/DesignAppearanceSection.tsx` — Prominent image field for flyer cards

When `card_type === 'flyer'`, restructure this section to:
- Rename the label from "Background Image URL (optional)" to **"Flyer Image URL (required)"**
- Move the image field to the top of the section and make it visually prominent
- Add an **image preview** below the input that renders the current `image_url` as an `<img>` tag (with a placeholder state when empty)
- Hide the color theme and icon pickers when card type is `flyer` since they are irrelevant — the flyer is just an image

#### 2. `src/components/admin/hero-cards/form-sections/types.ts` — Ensure `FormSectionProps` includes `formData` with `card_type`

Already included — `formData` has `card_type`. No changes needed.

### Technical Details

- The image preview will use a simple `<img>` tag with `object-contain` styling inside a bordered container, with an error/fallback state showing "Invalid image URL"
- For non-flyer card types, the section remains unchanged
- The live preview on the right column already renders the `FlyerHeroCard` component, so once `image_url` is set it will also show there — but the inline preview in the form section gives immediate feedback without scrolling

### Files Modified
- `src/components/admin/hero-cards/form-sections/DesignAppearanceSection.tsx` — conditional layout for flyer cards with image preview, hide irrelevant pickers


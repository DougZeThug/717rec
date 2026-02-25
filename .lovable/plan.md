

## Plan: Add Event Flyer to Homepage via New "Flyer" Hero Card Type

### Approach

The best way to do this is to add a new hero card type called `flyer` to the existing system. This keeps the flyer admin-manageable (toggle visibility, change image, reorder) without hardcoding anything. The flyer card will render a full-width, prominent image that can be placed above all other content using `sort_order`.

### Changes

#### 1. Copy the flyer image into the project
- Copy `user-uploads://Blind_Draw_signup.png` to `public/images/blind-draw-flyer.png` so it can be referenced by URL in the hero card's `image_url` field.

#### 2. `src/types/heroCard.ts` — Add `'flyer'` to the `HeroCardType` union
```typescript
export type HeroCardType =
  | 'standard'
  | 'champions'
  | 'event'
  | 'announcement'
  | 'participation'
  | 'request'
  | 'flyer';
```

#### 3. New file: `src/components/hero/FlyerHeroCard.tsx`
A simple card component that renders a full-width image with:
- Rounded corners, shadow, and optional click-through (uses `card.cta_url` if set)
- Responsive sizing — constrained to a reasonable max-width so it doesn't stretch on desktop
- Uses `card.image_url` as the image source
- Minimal chrome — the flyer image IS the card content

#### 4. `src/components/hero/HeroCard.tsx` — Add the `'flyer'` case
```typescript
case 'flyer':
  return <FlyerHeroCard card={card} />;
```

#### 5. `src/pages/Index.tsx` — Move hero cards above the HeroSection header
Currently hero cards render inside the container div below `HeroSection`. To make the flyer appear "before anything else," the hero cards loop will be moved above `HeroSection` (or the flyer-type cards specifically rendered first). Since the hero card system already supports `sort_order`, giving the flyer card `sort_order: 0` will place it at the top.

Actually, looking at this more carefully — the hero cards already render right after `HeroSection` which is the first visible element. The `HeroSection` is the site header/branding. Placing the flyer *above* the site header would look odd. Instead, the flyer will render as the **first hero card** (via sort_order), immediately below the header — which is already how hero cards work. No changes needed to Index.tsx layout.

#### 6. Admin form — Add `'flyer'` to card type options
In `src/components/admin/hero-cards/form-sections/CardBasicsSection.tsx`, add `'flyer'` to the card type dropdown so admins can create flyer-type cards. When flyer is selected, the `image_url` field becomes the primary content field.

### How to use it
1. Go to Admin > Hero Cards > Create Card
2. Set card type to "Flyer"
3. Set `image_url` to `/images/blind-draw-flyer.png` (or any image URL)
4. Optionally set `cta_url` to link somewhere when clicked
5. Set `sort_order` to `0` and `is_visible` to true
6. The flyer will appear as the first thing below the site header

### Files Modified
- `public/images/blind-draw-flyer.png` — copied flyer image
- `src/types/heroCard.ts` — add `'flyer'` type
- `src/components/hero/FlyerHeroCard.tsx` — new flyer card component
- `src/components/hero/HeroCard.tsx` — add flyer case
- `src/components/admin/hero-cards/form-sections/CardBasicsSection.tsx` — add flyer to type dropdown


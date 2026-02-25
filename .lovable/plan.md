

## Plan: File Upload with Drag-and-Drop for Flyer Images (No Compression)

### Changes

#### 1. Database migration — Create `hero-cards` storage bucket

Create a public storage bucket for hero card images with admin-only write access.

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-cards', 'hero-cards', true);

CREATE POLICY "Anyone can read hero-cards" ON storage.objects
  FOR SELECT USING (bucket_id = 'hero-cards');

CREATE POLICY "Admins can upload hero-cards" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hero-cards' AND public.current_user_is_admin());

CREATE POLICY "Admins can delete hero-cards" ON storage.objects
  FOR DELETE USING (bucket_id = 'hero-cards' AND public.current_user_is_admin());
```

#### 2. `src/utils/imageUpload.ts` — Add `uploadHeroCardImage`

New function that uploads the file **as-is with no compression** to preserve flyer clarity. Simply generates a UUID filename and uploads to the `hero-cards` bucket.

```typescript
export const uploadHeroCardImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `flyers/${fileName}`;

  const { error } = await supabase.storage.from('hero-cards').upload(filePath, file);
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('hero-cards').getPublicUrl(filePath);
  return publicUrl;
};
```

No compression, no resizing, no format conversion — the original file is uploaded at full quality.

#### 3. `src/components/admin/hero-cards/form-sections/DesignAppearanceSection.tsx` — Add drag-and-drop upload zone

Replace the static preview area with an interactive upload zone:

- **Click the dashed area** → opens a hidden `<input type="file" accept="image/*">`
- **Drag-and-drop** a file onto the area → uploads it
- **Visual feedback**: dragging highlight, upload spinner, success preview, error state
- **URL input remains** below for pasting external URLs
- On successful upload, calls `onChange('image_url', publicUrl)` which updates both the inline preview and the live card preview
- Loading state with spinner during upload

#### 4. `src/components/hero/FlyerHeroCard.tsx` — Mobile-friendly improvements

- Remove `max-w-3xl` constraint so the flyer uses full container width on mobile
- Add responsive max-width: full width on mobile, constrained on desktop (`max-w-3xl` at `md:` breakpoint)
- Ensure the image scales properly with `w-full h-auto`

### Files Modified
- Database migration: `hero-cards` storage bucket + RLS policies
- `src/utils/imageUpload.ts` — add `uploadHeroCardImage` (no compression)
- `src/components/admin/hero-cards/form-sections/DesignAppearanceSection.tsx` — drag-and-drop upload zone
- `src/components/hero/FlyerHeroCard.tsx` — responsive mobile-first layout


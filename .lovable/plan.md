

## Plan: Restrict Public Bucket Listing

### The problem

Four public buckets (`teams`, `team-images`, `hero-cards`, `team-logos`) have broad SELECT policies on `storage.objects` like `bucket_id = 'teams'`. This lets any anonymous client call `storage.from('teams').list()` and enumerate every file in every team folder. Public read of known URLs is fine — listing all files is not.

### The fix

**1 migration** — Replace the broad SELECT policies so reads still work via direct public URLs, but `.list()` calls return no rows for anonymous users. The standard pattern is to keep public `getPublicUrl()` working (which doesn't query `storage.objects`) while restricting the SELECT policy so listing requires authentication or admin.

For each affected bucket:

```sql
-- teams
DROP POLICY "Public Access for team images" ON storage.objects;
CREATE POLICY "Authenticated can list team images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'teams');

-- team-images
DROP POLICY "Allow public read access on team images" ON storage.objects;
CREATE POLICY "Authenticated can list team-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'team-images');

-- hero-cards
DROP POLICY "Anyone can read hero-cards" ON storage.objects;
CREATE POLICY "Authenticated can list hero-cards"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hero-cards');

-- team-logos: no SELECT policy currently exists, add authenticated-only
CREATE POLICY "Authenticated can list team-logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'team-logos');
```

Buckets stay `public = true`, so `getPublicUrl()` URLs continue to render images for anonymous visitors (the CDN serves them without hitting RLS). Only `.list()` and metadata queries now require auth.

### Verification needed first

I need to confirm no anonymous code path calls `.list()` on these buckets. `TeamDeleteService.ts` calls `.list('teams/<id>')` but it runs from the admin panel (authenticated). I'll grep for other `.list(` callers before applying the migration to be safe.

### What changes

- **1 migration** — drops 3 broad public SELECT policies, adds 4 authenticated-only SELECT policies
- **0 source files changed** (assuming verification passes)


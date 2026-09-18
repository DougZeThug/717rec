# og-recap worker

Gives a shared `717rec.app/recap/...` link the right preview image.

## Why it exists

717rec is a client-rendered app. Facebook, Instagram, X and Slack do not run
JavaScript, so the per-page tags `SeoHead` sets in the browser never reach them.
Without this worker every recap link previews with the generic league logo
instead of that week's graphic.

## What it does

Sits on `717rec.app/recap/*` only.

- **A human** gets the origin's response, unchanged.
- **A crawler** gets the same HTML with the `<head>` rewritten: the edition's
  title, its caption as the description, and its stored graphic as `og:image`
  with a `summary_large_image` card.

It reads published editions through PostgREST with the publishable key, so the
same RLS policy that protects the public page protects this — a draft cannot
leak through it.

**It fails open.** Any error, timeout or unexpected shape returns the origin
response untouched, so a problem here cannot take the recap page down.

## Deploying it

This is a **separate deploy from the app.** 717rec ships through Lovable Publish
(`docs/RELEASE_AND_DEPLOYMENT.md`), and the repo's root `wrangler.toml` is not
used by any script or CI job. Nothing here goes out with a normal release.

```sh
cd workers/og-recap
npx wrangler secret put SUPABASE_ANON_KEY   # the publishable key, first time only
npx wrangler deploy
```

Record the deploy in `docs/PRODUCTION_SETTINGS.md` §5 beside the pg_cron job.

## Checking it worked

```sh
# As a human — no og:image beyond the league default
curl -s https://717rec.app/recap/fall-2026/week-6 | grep 'og:image'

# As a crawler — the week's graphic
curl -s -A 'facebookexternalhit/1.1' https://717rec.app/recap/fall-2026/week-6 | grep 'og:image'
```

Then paste the link into the
[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and
press **Scrape Again**; Facebook caches previews hard.

## Rolling it back

`npx wrangler delete` removes the worker, or delete the route in the Cloudflare
dashboard. The recap page keeps working either way — it just previews with the
league logo again.

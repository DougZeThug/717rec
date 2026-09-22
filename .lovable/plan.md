# Fix the size-limit failure (main entry 158.82 kB vs 155 kB limit)

## What is wrong

The app's first-download JavaScript is 3.82 kB over the allowed budget. It grew from the recent package upgrades (zod, react-router, framer-motion, lucide-react, react-query, mcp-js) plus the live-update fixes. Everything else is fine — total size is under its limit.

## Steps

1. **Build and inspect the main entry** to see which package grew.
   - Run `npm run build`, then compare the `dist/assets/index-*.js` contents against the last passing build (130.97 kB on 2026-07, 155 kB limit raised at some point since).
   - Identify the biggest contributors in the main chunk.

2. **Try a real reduction first** (preferred):
   - If a heavy module landed in the main chunk that a page only needs sometimes (e.g. zod schemas, the MCP setup, a large icon set), move it behind a lazy load, following the existing patterns (React.lazy for pages, dynamic import like `loadBracketStyles`).
   - Keep the diff small — only move what clearly does not belong on first paint.

3. **If no safe reduction is found**, raise the limit:
   - Update `.size-limit.json` "Main entry (index)" from `155 KB` to `165 KB` with headroom, and record why in a comment-free commit message.
   - This is a fallback, not the default.

4. **Verify**:
   - `npm run size` passes.
   - `npm run typecheck`, `npm run lint`, and the affected tests still pass.
   - The preview still loads the home page normally.

## Technical details

- The size check reads `dist/assets/index-*.js`; lazy chunks with other names do not count against the main entry.
- vite.config.ts already names lazy chunks explicitly (e.g. `vendor-html-to-image`) so they are not miscounted — reuse that technique if a moved module would otherwise land back in `index-*.js`.
- No behavior change intended; this is build/packaging work only.

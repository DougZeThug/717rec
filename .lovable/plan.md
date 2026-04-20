

## Plan: Phase A — Remove unused dependencies

### Verification results

I grepped each candidate. Here's the truth:

| Package | Used? | Evidence |
|---|---|---|
| `@radix-ui/react-aspect-ratio` | ❌ No | Only in `src/components/ui/aspect-ratio.tsx`, which nothing imports |
| `@radix-ui/react-context-menu` | ❌ No | Only in unused `ui/context-menu.tsx` |
| `@radix-ui/react-hover-card` | ❌ No | Only in unused `ui/hover-card.tsx` |
| `@radix-ui/react-menubar` | ❌ No | Only in unused `ui/menubar.tsx` |
| `@radix-ui/react-navigation-menu` | ❌ No | Only in unused `ui/navigation-menu.tsx` |
| `@radix-ui/react-slider` | ❌ No | Only in unused `ui/slider.tsx` |
| `input-otp` | ❌ No | Only in unused `ui/input-otp.tsx` |
| `react-resizable-panels` | ❌ No | Only in unused `ui/resizable.tsx` |
| `@types/uuid` | ⚠️ Keep | `uuid` itself is used in `src/utils/imageUpload.ts`; types help TS |
| `brackets-model` | ⚠️ Keep | Referenced in `vite.config.ts` manualChunks |
| `nanoid` | ✅ Used | `src/services/brackets/FinalsGenerator.ts` |
| `react-router-dom` | ⚠️ Keep | Referenced in `vite.config.ts` manualChunks |
| `usehooks-ts` | ⚠️ Investigate | Used in `ui/expandable-tabs.tsx`, but that file appears unused |
| `@tailwindcss/typography` | ❌ No | Not in tailwind plugins array, not imported anywhere |

### What to remove

**8 packages safe to remove now** (UI wrappers + their Radix deps, all confirmed orphaned):
- `@radix-ui/react-aspect-ratio` + `src/components/ui/aspect-ratio.tsx`
- `@radix-ui/react-context-menu` + `src/components/ui/context-menu.tsx`
- `@radix-ui/react-hover-card` + `src/components/ui/hover-card.tsx`
- `@radix-ui/react-menubar` + `src/components/ui/menubar.tsx`
- `@radix-ui/react-navigation-menu` + `src/components/ui/navigation-menu.tsx`
- `@radix-ui/react-slider` + `src/components/ui/slider.tsx`
- `input-otp` + `src/components/ui/input-otp.tsx`
- `react-resizable-panels` + `src/components/ui/resizable.tsx`

**1 dev dep safe to remove**:
- `@tailwindcss/typography` (not in plugins, no `prose` audit needed since it's not registered)

**3 packages flagged but NOT safe to remove**:
- `@types/uuid` — `uuid` is actively used; types support it.
- `brackets-model` — referenced in `vite.config.ts` `manualChunks`. Removing breaks build.
- `react-router-dom` — referenced in `vite.config.ts` `manualChunks`. Project uses `react-router` v7 in code, but the chunk config still names `react-router-dom`. Removing requires also editing `vite.config.ts`.

**1 needs decision**:
- `usehooks-ts` — only used by `ui/expandable-tabs.tsx`, which has zero importers. If we delete that file too, `usehooks-ts` can go.

### Steps

1. Delete 9 unused UI wrapper files listed above + `ui/expandable-tabs.tsx`.
2. Remove 9 packages from `package.json` `dependencies`: the 8 above + `usehooks-ts`.
3. Remove `@tailwindcss/typography` from `devDependencies`.
4. Run `npm install` (lockfile refresh) and `npm run build` + `npm run typecheck` to confirm nothing broke.

### Phase A.2 — Duplicate exports

My grep for files containing both `export default` and a named `export {` returned **0 matches**. The "46 duplicate exports" claim does not reproduce against the current codebase. Before planning this work, I need the tool/command that produced the 46 number so I can target the right pattern (it may be re-export barrels like `export { default as X } from './X'` paired with the file's own `export default`).

### Files touched

- `package.json` (remove 10 entries)
- Delete: `src/components/ui/{aspect-ratio,context-menu,hover-card,menubar,navigation-menu,slider,input-otp,resizable,expandable-tabs}.tsx`

### Rollback

Revert `package.json` and restore deleted files from git. One step.

### Open question for you

Do you want me to (a) proceed with the 9 confirmed packages above now and skip the duplicate-export task until you share the source of the "46" count, or (b) also dig into the duplicate-export pattern myself first?


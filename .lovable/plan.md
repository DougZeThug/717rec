

## Dependency Bump: 22 Production Packages

### Risk Assessment

| Package | From → To | Risk | Notes |
|---------|-----------|------|-------|
| `react-helmet-async` | 2.0.5 → **3.0.0** | **Medium** | Major version. Likely adds React 19 peer dep. Your project uses React 18 + `legacy-peer-deps=true`, so install will work. The `Helmet`/`HelmetProvider` API used in App.tsx, Help, Contact, Compare is unchanged. |
| `brackets-manager` | 1.8.2 → 1.9.1 | **Low** | Minor bump. Bracket logic is central to playoffs — worth a quick smoke test. |
| `@supabase/supabase-js` | 2.97.0 → 2.99.3 | **Low** | Patch-level within v2. No API changes expected. |
| `@tanstack/react-query` | 5.90.21 → 5.95.0 | **Low** | Minor within v5. Query hooks unchanged. |
| `@sentry/react` | 10.43.0 → 10.45.0 | **Low** | Patch within v10. |
| All others | — | **Minimal** | Patch/minor bumps to Capacitor, framer-motion, lucide-react, nanoid, react-hook-form. |

### Plan

**1. Update `package.json`** — Bump all 11 listed packages (the PR mentions 22 but the user's message lists 11 visible ones; the caret ranges already cover most).

Specific version pins to update:
- `@capacitor/core`: `^8.2.0`
- `@capgo/capacitor-social-login`: `^8.3.9`
- `@sentry/react`: `^10.45.0`
- `@supabase/supabase-js`: `^2.99.3`
- `@tanstack/react-query`: `^5.95.0`
- `brackets-manager`: `^1.9.1`
- `framer-motion`: `^12.38.0`
- `lucide-react`: `^0.577.0`
- `nanoid`: `^5.1.7`
- `react-helmet-async`: `^3.0.0`
- `react-hook-form`: `^7.72.0`

**2. Verify build** — Run `tsc --noEmit` and `vite build` to catch any type or bundling issues from the major `react-helmet-async` bump.

**3. No code changes expected** — The APIs used (`Helmet`, `HelmetProvider`, bracket manager's `BracketsManager` class) have not changed across these versions.

### Technical Detail

The only major version bump is `react-helmet-async` 2 → 3. Based on the library's GitHub, v3 primarily updates peer dependencies to support React 19. Since this project stays on React 18 and `.npmrc` has `legacy-peer-deps=true`, the install will succeed without conflicts. The exported `Helmet` and `HelmetProvider` components are API-stable.


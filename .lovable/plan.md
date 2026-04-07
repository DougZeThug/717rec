

## Bump Production Dependencies

### What we're doing

Updating 6 production dependencies to their latest versions as proposed by Dependabot.

### Updates

| Package | From | To | Risk |
|---------|------|----|------|
| `@tanstack/react-query` | 5.96.1 | 5.96.2 | Patch — bug fixes only |
| `lucide-react` | 0.577.0 | 1.7.0 | **Major version bump** — but only breaking change is removal of brand icons (Github, Facebook, etc.) which this project does not use. API is identical. |
| `react-hook-form` | 7.72.0 | 7.72.1 | Patch — bug fixes only |
| `react-resizable-panels` | 4.8.0 | 4.9.0 | Minor — additive features |
| `react-router` | 7.13.2 | 7.14.0 | Minor — additive features |
| `react-router-dom` | 7.13.2 | 7.14.0 | Minor — additive features |

### Verification

- The project uses 346 files with lucide-react imports — none use removed brand icons (Github, Figma, etc.)
- No API changes in lucide-react v1 beyond brand icon removal
- All other packages are patch/minor bumps with no breaking changes

### Steps

1. Update all 6 versions in `package.json`
2. Run `npm install --legacy-peer-deps` to sync lockfiles
3. Run `npm run build` to verify no compile errors
4. Run `npm run test` to verify all tests pass

### Scope

`package.json` + lockfile updates only. No code changes needed.


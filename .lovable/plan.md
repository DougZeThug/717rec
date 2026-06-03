## Goal
Update three development dependencies to their latest specified versions.

## Details
- `eslint`: `^10.4.0` → `^10.4.1`
- `eslint-plugin-prettier`: `^5.5.5` → `^10.5.6`  
- `typescript-eslint`: `^8.59.3` → `^8.60.0`

Note: These packages are currently in `devDependencies`, not `dependencies`.

## Steps
1. Update `package.json` version pins for the three packages.
2. Run `npm install` to update `package-lock.json`.
3. Verify the build passes (`npm run build`) and lint passes (`npm run lint`).

## Out of scope
- Any other dependency updates.
- Changes to ESLint configuration or rules.
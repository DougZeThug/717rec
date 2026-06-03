Update 7 npm packages to their latest patch/minor versions.

### Packages to update
| Package | Current | Target |
|---------|---------|--------|
| @sentry/react | 10.53.1 | 10.55.0 |
| @vitest/eslint-plugin | 1.6.18 | 1.6.19 |
| date-fns | 4.3.0 | 4.4.0 |
| lucide-react | 1.16.0 | 1.17.0 |
| react-hook-form | 7.76.1 | 7.77.0 |
| react-router | 7.15.1 | 7.16.0 |
| react-router-dom | 7.15.1 | 7.16.0 |

### Plan
1. Update version strings in `package.json` for all 7 packages.
2. Run `npm install` to update the lockfile.
3. Run a quick smoke test (`npm run build` and `npm test`) to verify nothing breaks.

These are all patch/minor bumps with no known breaking changes in our codebase.
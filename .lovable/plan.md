

## Dependency Updates

This is a straightforward update of 8 packages to their latest versions.

### Changes to Apply

| Package | From | To | Type |
|---------|------|-----|------|
| recharts | 3.6.0 | 3.7.0 | production |
| vite-plugin-beasties | 0.3.5 | 0.4.1 | production |
| zod | 4.3.5 | 4.3.6 | production |
| @vitejs/plugin-react-swc | 4.2.2 | 4.2.3 | dev |
| autoprefixer | 10.4.23 | 10.4.24 | dev |
| globals | 17.0.0 | 17.3.0 | dev |
| jsdom | 27.4.0 | 28.0.0 | dev |
| prettier | 3.7.4 | 3.8.1 | dev |

### Implementation

Update `package.json` with the new version numbers:
- 3 production dependencies
- 5 dev dependencies

Note: The jsdom update (27 → 28) is a major version bump, but this is typically safe for test environments. If any test issues arise after updating, we can investigate.


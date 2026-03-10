

## Dev Dependency Updates — Risk Assessment

### Safe to update (no breaking changes)
| Package | From | To |
|---|---|---|
| @types/node | ^25.2.3 | ^25.3.3 |
| eslint-plugin-react-refresh | ^0.5.0 | ^0.5.2 |
| typescript-eslint | ^8.56.0 | ^8.56.1 |

### Risky — hold off
| Package | From | To | Risk |
|---|---|---|---|
| eslint | ^9.39.3 | ^10.0.2 | **Major version with significant breaking changes** |

**ESLint 10 breaking changes that affect this project:**
- Requires Node.js >= 20.19
- `eslint:recommended` adds 3 new rules (`no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`) that may flag existing code
- Removes deprecated `context` members and `SourceCode` methods — plugins using old APIs will break
- Plugin ecosystem compatibility is uncertain: `eslint-plugin-vitest` v0.5.4 is outdated (renamed to `@vitest/eslint-plugin`), and there's no confirmed ESLint 10 support for several plugins used here

**Recommendation:** Update the 3 safe packages now. Defer ESLint 10 until plugin compatibility is confirmed across the ecosystem.

### Implementation
Update `package.json` devDependencies:
- `@types/node`: `^25.3.3`
- `eslint-plugin-react-refresh`: `^0.5.2`
- `typescript-eslint`: `^8.56.1`


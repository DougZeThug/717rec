## Problem

`npm run lint` fails on the newly added MCP files — mostly prettier (double quotes → single quotes, missing trailing newline) and `simple-import-sort` violations. All auto-fixable.

## Plan

1. Run `npx eslint . --fix` to auto-fix all prettier/import-sort violations across the repo (MCP files and any other stragglers).
2. Verify with `npm run lint` — expect 0 errors.

No behavior changes; formatting only.
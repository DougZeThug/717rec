/**
 * The site's own SEO constants, kept in a plain module so they can be read
 * without pulling in React.
 *
 * `workers/og-recap` keeps a hand copy of the resolved image URL: it deploys on
 * its own from `workers/og-recap`, and cannot import from `src/` (React, and
 * the `@/` alias its build knows nothing about). `tests/ogRecapWorker.test.ts`
 * asserts the two still agree.
 */
export const BASE_URL = 'https://717rec.app';
export const DEFAULT_IMAGE = '/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png';

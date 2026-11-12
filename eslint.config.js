import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import vitest from '@vitest/eslint-plugin';

// Import rules, built from the pieces below (see ARCHITECTURE.md → Layer rules).
// A later config block REPLACES the earlier `no-restricted-imports` options for
// the files it matches (flat config does not merge them), so every block below
// lists its full set of patterns.

// Supabase client ban. A pattern, not a path, so a relative import is caught too.
// Only the `supabase` export is banned, so src/main.tsx may still import
// `isSupabaseConfigured` from the same module.
const SUPABASE_CLIENT = {
  group: ['**/integrations/supabase/client'],
  importNames: ['supabase'],
  message:
    'Import the Supabase client only inside src/services/. Components and hooks should call a service function instead (see CLAUDE.md → Architecture Rules).',
};

// The realtime .channel() hooks may import the Supabase client. Listed BY FILE
// (no src/hooks/** folder glob). A new realtime hook must be added to this list.
const REALTIME_HOOKS = [
  'src/hooks/brackets/useBracketsManagerRealtime.ts',
  'src/hooks/contact/useContactRequests.ts',
  'src/hooks/live-scoring/useLiveMatchRealtime.ts',
  'src/hooks/matches/useMatchComments.ts',
  'src/hooks/matches/useMatchReactions.ts',
  'src/hooks/message-board/useMessageReactions.ts',
  'src/hooks/message-board/useMessageRealtime.ts',
  'src/hooks/notifications/useNotificationsRealtime.ts',
  'src/hooks/realtime/subscribeWithRetry.ts',
  'src/hooks/support/useSupportTickets.ts',
  'src/hooks/useBracketCompletion.ts',
  'src/hooks/useOpsHealth.ts',
];

// Layer direction: Components → Hooks → Services → Supabase. A lower layer never
// imports a higher one. BANNED lists, per zone, the layers that zone must not import.
// Only static imports of `@/...` and `../...` paths are checked: dynamic `import()`,
// `require()` and a hop through contexts or lib are not.
const LAYERS = ['services', 'hooks', 'components', 'pages'];
const BANNED = {
  types: LAYERS,
  utils: LAYERS,
  services: ['hooks', 'components', 'pages'],
  hooks: ['components', 'pages'],
};
const WHY = {
  types:
    'src/types sits at the bottom of the app and must not import services, hooks, components or pages. Move the shared piece down into types or utils, or move this file up to the layer that needs it (see ARCHITECTURE.md → Layer rules).',
  utils:
    'src/utils sits at the bottom of the app and must not import services, hooks, components or pages. Pass the data in as an argument, or move the shared code down into utils or types (see ARCHITECTURE.md → Layer rules).',
  services:
    'Services must not import hooks, components or pages (Components → Hooks → Services → Supabase). Take what you need as an argument, or move the shared code down into utils or types (see ARCHITECTURE.md → Layer rules).',
  hooks:
    "Hooks must not import components or pages (Components → Hooks → Services → Supabase). Move the shared piece down into a service, util or type. A hook used by one component can live in that component's own hooks folder (see ARCHITECTURE.md → Layer rules).",
};
// Matches `@/` and any run of `../`. Dots are written as [.] on purpose: in a plain
// string '\.' loses its backslash and would also match scoped packages like '@x/hooks'.
const FROM = String.raw`(?:@/|(?:[.][.]/)+)`;
// Bans every layer listed for the zone. `allow` names whole modules (alias form)
// that one file may still import; the lookahead lets exactly those through.
const layerBan = (zone, allow = []) => ({
  regex: `^${allow.length ? `(?!${FROM}(?:${allow.join('|')})$)` : ''}${FROM}(?:${BANNED[zone].join('|')})(?:/|$)`,
  caseSensitive: true,
  message: WHY[zone],
});
const imports = (...patterns) => ({ rules: { 'no-restricted-imports': ['error', { patterns }] } });
const inZone = (zone) => `src/${zone}/**/*.{ts,tsx}`;

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      '*.config.js',
      'public/**',
      'src/integrations/supabase/types.ts',
      'supabase/functions/mcp/**',
      'supabase/functions/mcp-public/**',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier: prettier,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // React Hooks
      ...reactHooks.configs.recommended.rules,

      // React Refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Prefer Boolean()/Number()/String() over !!x, +x, "" + x (DeepSource JS-0066).
      'no-implicit-coercion': 'error',

      // An empty function needs a comment that says why (DeepSource JS-0321).
      'no-empty-function': 'error',

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Forbid silencing the type-checker with @ts-ignore / @ts-nocheck.
      // @ts-expect-error is allowed but must carry a short explanation.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
        },
      ],

      // Architecture: keep the Supabase client out of components, hooks and utils.
      // All DB access goes through src/services/. This is the default for every
      // file (components and pages get the Supabase ban only). The blocks below
      // add the layer-direction ban per folder and switch the Supabase ban off
      // for the files that may use the client.
      'no-restricted-imports': ['error', { patterns: [SUPABASE_CLIENT] }],

      // Never use select('*') — list columns explicitly (see CLAUDE.md).
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='select'] > Literal[value=/\\*/]",
          message:
            "Avoid wildcard select('*') in Supabase queries — list the columns you need explicitly (see CLAUDE.md → Architecture Rules).",
        },
        // Never write a colour twice, once for light and once after `dark:`.
        // The token already holds the right value for every theme, and the
        // `dark:` half does nothing under the winter theme, whose class is
        // `winter-frozen`, not `dark`. Matches a fixed grey sitting in the same
        // class string as any `dark:` variant — the signature of a hand-written
        // pair. `-white/…` and `-black/…` are deliberately not matched: winter
        // arms use those and are out of scope for now.
        {
          selector:
            "Literal[value=/(^|\\s)(hover:|focus:|active:|group-hover:|even:|odd:)?(text|bg|border|from|via|to|divide|ring|placeholder|fill|stroke)-(gray|slate|zinc|neutral|stone)-[0-9]{2,3}(\\/[0-9]+)?(\\s|$)/][value=/(^|\\s)dark:/]",
          message:
            'Use a theme token instead of a fixed grey with a `dark:` twin: text-foreground, text-muted-foreground, bg-card, bg-muted, bg-accent, border-border (see CONTRIBUTING.md → Styling). If the colour carries meaning rather than a theme role — a medal, a category badge — disable this rule on the line and say why.',
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|\\s)(hover:|focus:|active:|group-hover:|even:|odd:)?(text|bg|border|from|via|to|divide|ring|placeholder|fill|stroke)-(gray|slate|zinc|neutral|stone)-[0-9]{2,3}(\\/[0-9]+)?(\\s|$)/][value.raw=/(^|\\s)dark:/]",
          message:
            'Use a theme token instead of a fixed grey with a `dark:` twin: text-foreground, text-muted-foreground, bg-card, bg-muted, bg-accent, border-border (see CONTRIBUTING.md → Styling). If the colour carries meaning rather than a theme role — a medal, a category badge — disable this rule on the line and say why.',
        },
        // The Supabase client ban above only sees static `import` statements.
        // These two selectors cover dynamic `import('…')` and `require('…')`.
        {
          selector: 'ImportExpression[source.value=/integrations\\/supabase\\/client$/]',
          message:
            'Import the Supabase client only inside src/services/ (dynamic import and require are covered too). Components and hooks should call a service function instead (see CLAUDE.md → Architecture Rules).',
        },
        {
          selector:
            "CallExpression[callee.name='require'][arguments.0.value=/integrations\\/supabase\\/client$/]",
          message:
            'Import the Supabase client only inside src/services/ (dynamic import and require are covered too). Components and hooks should call a service function instead (see CLAUDE.md → Architecture Rules).',
        },
      ],

      // Import Ordering - AUTO-FIXABLE
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // Prettier - Format enforcement
      'prettier/prettier': 'error',

      // General Quality - AUTO-FIXABLE
      'prefer-const': 'error',
      'no-var': 'error',

      // Every switch needs a default — for finite unions use
      // assertNever() from @/utils/assertNever so TS catches new members too.
      'default-case': 'error',

      // Define a name before you use it, so the file reads top to bottom.
      // `functions: false` keeps hoisted `function foo() {}` declarations
      // legal — a module may lead with its entry point and put the helpers
      // below. This mirrors DeepSource JS-0357, so lint and DeepSource agree.
      // See CONTRIBUTING.md → Component Guidelines → File Structure.
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
          enums: true,
          typedefs: true,
          ignoreTypeReferences: true,
          allowNamedExports: false,
        },
      ],
    },
  },
  // Import rules per folder. The order matters: a later block replaces the earlier
  // options for the files it matches, so zones come first, then the files that are
  // exempt from the Supabase ban, then the per-file layer exceptions, then "off".
  //
  // 1. Zones. types, utils and hooks get the Supabase ban plus the layer ban.
  //    Services own the Supabase client, so they get the layer ban only.
  { files: [inZone('types')], ...imports(SUPABASE_CLIENT, layerBan('types')) },
  { files: [inZone('utils')], ...imports(SUPABASE_CLIENT, layerBan('utils')) },
  { files: [inZone('services')], ...imports(layerBan('services')) },
  { files: [inZone('hooks')], ...imports(SUPABASE_CLIENT, layerBan('hooks')) },
  // 2. Files that may use the Supabase client but still sit in a zone: they obey
  //    the layer ban only.
  //    - the 12 realtime .channel() hooks (see REALTIME_HOOKS)
  //    - imageUpload.ts: uses Supabase Storage directly
  { files: REALTIME_HOOKS, ...imports(layerBan('hooks')) },
  { files: ['src/utils/imageUpload.ts'], ...imports(layerBan('utils')) },
  // 3. Known wrong-way imports. Each block allows exactly ONE module and still bans
  //    every other layer. These files are not exempt from the Supabase ban, so each
  //    block lists SUPABASE_CLIENT again. A stale block does not warn: remove each
  //    block when the cleanup named in the comment above it lands.
  //    Removed by the design PR for the leftover wrong-way imports.
  {
    files: ['src/utils/adminTabs.ts'],
    ...imports(SUPABASE_CLIENT, layerBan('utils', ['components/admin/dashboard/adminSections'])),
  },
  //    Removed by the design PR for the leftover wrong-way imports.
  {
    files: [
      'src/utils/autoSchedule/matchHistoryService.ts',
      'src/utils/autoSchedule/compatibilityUtils.ts',
    ],
    ...imports(SUPABASE_CLIENT, layerBan('utils', ['services/matches/MatchReadService'])),
  },
  //    Stays: a documented type-only exception (the toast types live with the UI).
  {
    files: ['src/hooks/useToast.ts'],
    ...imports(SUPABASE_CLIENT, layerBan('hooks', ['components/ui/toast'])),
  },
  // 4. Last: files exempt from both rules.
  //    - src/lib/mcp/**    → builds its own clients with createClient
  //    - OAuthConsent.tsx  → auth calls
  //    - test files        → import the client to mock it
  {
    files: [
      'src/lib/mcp/**/*.{ts,tsx}',
      'src/pages/OAuthConsent.tsx',
      '**/__tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'tests/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // Stricter rules for test files
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: {
      vitest: vitest,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'warn',
    },
  },
  // Apply Prettier config last (disables conflicting ESLint rules)
  eslintConfigPrettier
);

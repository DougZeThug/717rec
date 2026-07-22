import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import vitest from '@vitest/eslint-plugin';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      '*.config.js',
      'public/**',
      'src/integrations/supabase/types.ts',
      'supabase/functions/mcp/**',
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

      // Architecture: keep the Supabase client out of components/utils.
      // All DB access goes through src/services/. Allowed exceptions
      // (services, realtime hooks, image uploads, tests) are re-enabled below.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/integrations/supabase/client',
              importNames: ['supabase'],
              message:
                'Import the Supabase client only inside src/services/. Components and hooks should call a service function instead (see CLAUDE.md → Architecture Rules).',
            },
          ],
        },
      ],

      // Never use select('*') — list columns explicitly (see CLAUDE.md).
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='select'] > Literal[value=/\\*/]",
          message:
            "Avoid wildcard select('*') in Supabase queries — list the columns you need explicitly (see CLAUDE.md → Architecture Rules).",
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
    },
  },
  // Allowed exceptions to the Supabase client import restriction:
  // - src/services/**   → the service layer owns all database access
  // - src/hooks/**      → realtime .channel() subscriptions live in hooks
  // - imageUpload.ts    → uses Supabase Storage directly
  // - test files        → import the client to mock it
  {
    files: [
      'src/services/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/utils/imageUpload.ts',
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

import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import path from 'path';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isCi = process.env.CI === 'true' || process.env.CI === '1';
  const isDeepSourceCoverage = process.env.VITEST_DEEPSOURCE === '1';
  const isLightCoverage = process.env.VITEST_LIGHT_COVERAGE === '1';
  const isLocalDiagnostics = process.env.VITEST_LOCAL_DIAGNOSTICS === '1';
  const isFastCoverage = process.env.VITEST_FAST_COVERAGE === '1';
  // Keep CI/fast-gate coverage lightweight and reserve HTML for explicit
  // local diagnostics only.
  const coverageReporter = isDeepSourceCoverage
    ? ['text', 'lcovonly']
    : isCi || isLightCoverage
      ? ['text', 'json-summary']
      : isLocalDiagnostics
        ? ['text', 'html', 'json-summary']
        : ['text', 'json-summary'];
  const reportsDirectory = isDeepSourceCoverage ? './coverage/deepsource' : './coverage';
  const coverageInclude = ['src/**/*.{ts,tsx}'];

  return {
    server: {
      host: '::',
      port: 8080,
    },
    plugins: [react(), mode === 'development' && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      include: [
        '**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mjs,cts,tsx}',
        '**/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mjs,cts,tsx}',
      ],
      globals: true,
      // Surface hangs faster instead of waiting on Vitest's silent defaults.
      testTimeout: 15_000,
      hookTimeout: 15_000,
      teardownTimeout: 10_000,
      // Fast coverage path: parallel forks with normal per-file isolation.
      // We tried 'isolate: false' but ~33 test files in this repo rely on
      // fresh module state between files (AuthContext providers, auth/admin
      // hooks, etc.), so we keep isolation on and rely on parallelism for
      // the speedup. Falls back to Vitest defaults when VITEST_FAST_COVERAGE
      // is not set, so existing scripts ('test:coverage:debug', ':triage',
      // ':ci') keep their current single-worker behaviour.
      ...(isFastCoverage
        ? {
            pool: 'forks' as const,
            maxWorkers: 4,
            minWorkers: 1,
            fileParallelism: true,
            isolate: true,
          }
        : {}),
      coverage: {
        provider: 'v8',
        reporter: coverageReporter,
        reportsDirectory,
        include: coverageInclude,
        exclude: [
          'src/integrations/supabase/types.ts',
          'src/components/ui/**',
          'src/**/*.test.{ts,tsx}',
          'src/**/*.spec.{ts,tsx}',
          'src/setupTests.ts',
        ],
        // Floors sit ~3 points under the 2026-08-11 measured run. They are a
        // regression guard, not a target. Nested globs are cumulative: a file
        // under 'src/hooks/scheduling/**' is also counted by 'src/hooks/**'
        // and by the global set, which Vitest applies to every file regardless
        // of glob matches.
        thresholds: {
          lines: 67,
          functions: 61,
          branches: 54,
          statements: 65,
          'src/services/**': {
            lines: 86,
            functions: 87,
            branches: 70,
            statements: 83,
          },
          'src/services/brackets/viewer/**': {
            lines: 82,
            functions: 82,
            branches: 63,
            statements: 81,
          },
          'src/hooks/**': {
            lines: 59,
            functions: 52,
            branches: 45,
            statements: 57,
          },
          'src/hooks/auth/**': {
            lines: 69,
            functions: 60,
            branches: 55,
            statements: 67,
          },
          'src/hooks/scheduling/**': {
            lines: 61,
            functions: 62,
            branches: 43,
            statements: 60,
          },
          'src/components/**': {
            lines: 58,
            functions: 54,
            branches: 46,
            statements: 56,
          },
          'src/components/admin/**': {
            lines: 56,
            functions: 48,
            branches: 44,
            statements: 55,
          },
          'src/components/admin/live-corrections/**': {
            lines: 42,
            functions: 35,
            branches: 23,
            statements: 40,
          },
          'src/pages/**': {
            lines: 70,
            functions: 68,
            branches: 62,
            statements: 70,
          },
          'src/utils/**': {
            lines: 77,
            functions: 76,
            branches: 68,
            statements: 76,
          },
          'src/utils/autoSchedule/**': {
            lines: 68,
            functions: 66,
            branches: 54,
            statements: 67,
          },
          'src/utils/autoSchedule/blossom/**': {
            lines: 60,
            functions: 56,
            branches: 47,
            statements: 58,
          },
        },
      },
    },
  };
});

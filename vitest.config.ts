import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import path from 'path';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isCi = process.env.CI === 'true' || process.env.CI === '1';
  const isCiCoverage = process.env.VITEST_CI_COVERAGE === '1';
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
  const coverageInclude = isCiCoverage
    ? ['src/services/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}', 'src/utils/**/*.{ts,tsx}']
    : ['src/**/*.{ts,tsx}'];

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
      // We tried `isolate: false` but ~33 test files in this repo rely on
      // fresh module state between files (AuthContext providers, auth/admin
      // hooks, etc.), so we keep isolation on and rely on parallelism for
      // the speedup. Falls back to Vitest defaults when VITEST_FAST_COVERAGE
      // is not set, so existing scripts (`test:coverage:debug`, `:triage`,
      // `:ci`) keep their current single-worker behaviour.
      ...(isFastCoverage
        ? {
            pool: 'forks' as const,
            poolOptions: {
              forks: {
                singleFork: false,
                maxForks: 4,
                minForks: 1,
              },
            },
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
        thresholds: {
          lines: 27.27,
          functions: 21.12,
          branches: 19.98,
          statements: 26.96,
          'src/services/**': {
            lines: 45,
            functions: 40,
            branches: 35,
            statements: 45,
          },
          'src/hooks/**': {
            lines: 15,
            functions: 15,
            branches: 12,
            statements: 15,
          },
          'src/utils/**': {
            lines: 50,
            functions: 45,
            branches: 40,
            statements: 50,
          },
        },
      },
    },
  };
});

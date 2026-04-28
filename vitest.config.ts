import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import path from 'path';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isCi = process.env.CI === 'true' || process.env.CI === '1';
  const isCiCoverage = process.env.VITEST_CI_COVERAGE === '1';
  // Keep json-summary in every environment for DeepSource ingestion while
  // avoiding html report generation costs in CI.
  const coverageReporter = isCi
    ? ['text', 'json-summary']
    : ['text', 'html', 'json-summary'];
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
      coverage: {
        provider: 'v8',
        reporter: coverageReporter,
        reportsDirectory: './coverage',
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

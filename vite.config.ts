import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import path from 'path';
import { defineConfig, type PluginOption } from 'vite';
import { beasties } from 'vite-plugin-beasties';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-supabase': ['@supabase/supabase-js'],
          // Separate Sentry into its own chunk so it doesn't block main bundle
          'vendor-sentry': ['@sentry/react'],
          // NOTE: recharts is intentionally NOT pinned to a manualChunk. The chart
          // components are lazy-loaded via React.lazy, so Rollup keeps recharts in
          // on-demand chunks. Forcing it into a named manualChunk turns it into a
          // static (eager) import of every page that references a chart, which
          // defeats the lazy-loading and loads ~160 KB gzipped up front.
        },
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' &&
      beasties({
        options: {
          preload: 'swap',
          pruneSource: false,
          inlineThreshold: 2000,
          reduceInlineStyles: true,
          mergeStylesheets: true,
          additionalStylesheets: [],
        },
      }),
  ].filter(Boolean) as PluginOption[],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mjs,cts,tsx}'],
    globals: true,
  },
}));

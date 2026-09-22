import { mcpPlugin } from '@lovable.dev/mcp-js/stacks/supabase/vite';
import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import path from 'path';
import { defineConfig, type Plugin, type PluginOption } from 'vite';
import { beasties } from 'vite-plugin-beasties';

// Dev-only: inject the Lovable editor bridge so in-preview editing works.
// Never ships to production (apply: 'serve').
const lovableEditorDevPlugin = (): Plugin => ({
  name: 'inject-lovable-editor-dev',
  apply: 'serve',
  transformIndexHtml(html) {
    return html.replace(
      '</body>',
      '  <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>\n  </body>'
    );
  },
});

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
          // Only ever reached through a dynamic import in the admin recap
          // exporter, so naming it here does not make it eager - it just stops
          // Rollup calling the chunk `index-*.js` after the package's own entry
          // file. The size-limit "Main entry" check globs `dist/assets/index-*.js`
          // and would otherwise count this lazy chunk as part of first paint.
          'vendor-html-to-image': ['html-to-image'],
          // Same trick for the native Google login plugin: it is only reached
          // through a dynamic import in utils/nativeAuth.ts, so naming it keeps
          // its chunk from being called `index-*.js` and miscounted as main.
          'vendor-capgo-social-login': ['@capgo/capacitor-social-login'],
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
    mcpPlugin(),
    mcpPlugin({ mcpEntry: 'src/lib/mcp/public/index.ts', functionName: 'mcp-public' }),
    mode === 'development' && componentTagger(),
    mode === 'development' && lovableEditorDevPlugin(),
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

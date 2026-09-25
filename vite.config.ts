import { mcpPlugin } from '@lovable.dev/mcp-js/stacks/supabase/vite';
import tailwindcss from '@tailwindcss/vite';
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
    // Vite 7's default browser list, written out. Vite 8 raises the default to
    // Safari 16.4 / Chrome 111, which would give a blank page on iPhones still
    // on iOS 16.0-16.3. Keep this list until we decide to drop those phones.
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
    rolldownOptions: {
      output: {
        // Each group's `test` is anchored on a whole package folder, so `react`
        // does not also catch `react-hook-form` and the like. A group also takes
        // the package's own dependencies with it - but only for modules that are
        // really bundled. A package that only re-exports another one is skipped,
        // so name the real package on its own.
        codeSplitting: {
          groups: [
            // Highest priority: framer-motion and Sentry import React too, and
            // React must stay in this chunk rather than follow them.
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
              priority: 20,
            },
            { name: 'vendor-motion', test: /[\\/]node_modules[\\/]framer-motion[\\/]/ },
            {
              name: 'vendor-supabase',
              test: /[\\/]node_modules[\\/]@supabase[\\/]supabase-js[\\/]/,
            },
            // Separate Sentry into its own chunk so it doesn't block main bundle
            { name: 'vendor-sentry', test: /[\\/]node_modules[\\/]@sentry[\\/]react[\\/]/ },
            // Only ever reached through a dynamic import in the admin recap
            // exporter, so naming it here does not make it eager - it just stops
            // Rolldown calling the chunk `index-*.js` after the package's own
            // entry file. The size-limit "Main entry" check globs
            // `dist/assets/index-*.js` and would otherwise count this lazy chunk
            // as part of first paint.
            { name: 'vendor-html-to-image', test: /[\\/]node_modules[\\/]html-to-image[\\/]/ },
            // Same trick for the native Google login plugin: it is only reached
            // through a dynamic import in utils/nativeAuth.ts, so naming it keeps
            // its chunk from being called `index-*.js` and miscounted as main.
            {
              name: 'vendor-capgo-social-login',
              test: /[\\/]node_modules[\\/]@capgo[\\/]capacitor-social-login[\\/]/,
            },
            // NOTE: recharts is intentionally NOT in a group. The chart
            // components are lazy-loaded via React.lazy, so Rolldown keeps
            // recharts in on-demand chunks. Forcing it into a named group turns
            // it into a static (eager) import of every page that references a
            // chart, which defeats the lazy-loading and loads ~160 KB gzipped
            // up front.
          ],
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
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
      '@': path.resolve(import.meta.dirname, './src'),
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

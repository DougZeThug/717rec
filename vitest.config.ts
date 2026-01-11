import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';
import path from 'path';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
    environment: 'jsdom', // Switched to jsdom which has better compatibility
    setupFiles: ['./src/setupTests.ts'],
    include: [
      '**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mjs,cts,tsx}',
      '**/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mjs,cts,tsx}',
    ],
    globals: true,
  },
}));

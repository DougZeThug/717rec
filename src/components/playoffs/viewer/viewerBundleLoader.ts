/**
 * Isolated one-liner so tests can control chunk-load outcomes
 * deterministically. The dist bundle is an IIFE whose side effect registers
 * window.bracketsViewer; Vite code-splits it into a lazy chunk (no runtime
 * CDN fetch).
 */
export const importViewerBundle = (): Promise<unknown> =>
  import('brackets-viewer/dist/brackets-viewer.min.js');

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const css = (file: string) => readFileSync(resolve(__dirname, '..', file), 'utf8');
const indexCss = readFileSync(resolve(__dirname, '..', '..', 'index.css'), 'utf8');

/**
 * The winter theme is a dark surface, but next-themes puts only one class on
 * <html>, so winter never gets `.dark`. The `dark:` variant has to match
 * `.winter-frozen` itself, or every `dark:` utility is silently skipped there.
 */
describe('dark variant and the winter theme', () => {
  it('treats .winter-frozen as dark for every dark: utility', () => {
    const variant = indexCss.match(/@custom-variant dark \(([^;]+)\);/)?.[1];
    expect(variant).toBeDefined();
    expect(variant).toContain('.dark *');
    expect(variant).toContain('.winter-frozen *');
  });

  it('gives the winter theme the same plain-CSS dark rules', () => {
    expect(css('utilities.css')).toMatch(/\.winter-frozen \.cornhole-bg::before/);
    expect(css('brackets-viewer-717rec-theme.css')).toMatch(/\.winter-frozen \.brackets-viewer/);
  });

  it('tells the browser both dark themes are dark', () => {
    expect(css('base.css')).toMatch(/\.dark,\s*\.winter-frozen\s*\{\s*color-scheme:\s*dark/);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const css = (file: string) => readFileSync(resolve(__dirname, '..', file), 'utf8');

/** The text between `selector {` and its closing brace (the blocks here do not nest). */
const block = (text: string, selector: string): string => {
  const start = text.indexOf(`${selector} {`);
  if (start === -1) return '';
  return text.slice(start, text.indexOf('}', start));
};

const token = (text: string, name: string): string | undefined =>
  new RegExp(`${name}:\\s*([^;]+);`).exec(text)?.[1]?.trim();

describe('winter theme success colours', () => {
  // jsdom does no styling, so this reads the CSS text. `.winter-frozen` is a dark page but did not
  // define --success, so it fell back to the light theme's dark green: the Approve button text
  // measured 3.1:1 on the winter card (4.5:1 is the minimum).
  it('uses the same bright success green as the dark theme', () => {
    const winter = block(css('themes/winter-homepage.css'), '.winter-frozen');
    const dark = block(css('theme.css'), '.dark');

    expect(token(dark, '--success')).toBeDefined();
    expect(token(winter, '--success')).toBe(token(dark, '--success'));
    expect(token(winter, '--success-foreground')).toBe(token(dark, '--success-foreground'));
  });
});

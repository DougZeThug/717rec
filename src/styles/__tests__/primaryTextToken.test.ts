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

describe('primary text on a primary tint', () => {
  // jsdom does no styling, so this reads the CSS text. --primary is a fill: as
  // text on its own 10% tint it measured 4.49:1 in light and 3.61:1 in dark.
  // --primary-text is the text-only shade, like --destructive-text.
  const light = block(css('theme.css'), ':root');
  const dark = block(css('theme.css'), '.dark');
  const winter = block(css('themes/winter-homepage.css'), '.winter-frozen');

  it('is defined in every theme, so winter does not fall back to the light shade', () => {
    expect(token(light, '--primary-text')).toBeDefined();
    expect(token(dark, '--primary-text')).toBeDefined();
    expect(token(winter, '--primary-text')).toBeDefined();
  });

  it('is a utility (text-primary-text) and leaves the brand fill alone', () => {
    expect(css('../index.css')).toContain('--color-primary-text: hsl(var(--primary-text));');
    expect(token(light, '--primary')).toBe('221.2 83.2% 53.3%');
    expect(token(dark, '--primary')).toBe('221.2 83.2% 53.3%');
    expect(token(winter, '--primary')).toBe('199 89% 62%');
  });

  it('is deeper than the fill in light and lighter in dark', () => {
    const lightness = (value: string | undefined) => Number(value?.split(' ')[2]?.replace('%', ''));
    expect(lightness(token(light, '--primary-text'))).toBeLessThan(
      lightness(token(light, '--primary'))
    );
    expect(lightness(token(dark, '--primary-text'))).toBeGreaterThan(
      lightness(token(dark, '--primary'))
    );
  });
});

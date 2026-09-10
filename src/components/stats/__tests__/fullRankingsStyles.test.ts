import { describe, expect, it } from 'vitest';

import {
  standingsCardClasses,
  standingsContentClasses,
  standingsDescriptionClasses,
  standingsHeaderClasses,
  standingsTitleClasses,
} from '../fullRankingsStyles';

const winter = { isWinterTheme: true, isLight: false };
const light = { isWinterTheme: false, isLight: true };
const dark = { isWinterTheme: false, isLight: false };

// Three themes, and the winter one wins wherever they overlap. These were
// nested ternaries inside the card's cn() calls before they moved here.
describe('standings card theme classes', () => {
  it('gives the card a frost border in winter and a blue one otherwise', () => {
    expect(standingsCardClasses(winter)[0]).toContain('winter-card-surface');
    expect(standingsCardClasses(dark)[0]).toContain('border-blue-300');
  });

  it('adds the warm gradient only to the light theme', () => {
    expect(standingsCardClasses(light)[1]).not.toBe('');
    expect(standingsCardClasses(dark)[1]).toBe('');
    expect(standingsCardClasses(winter)[1]).toBe('');
  });

  it('picks a different header background for each of the three themes', () => {
    const [w, l, d] = [winter, light, dark].map(standingsHeaderClasses);

    expect(w).toContain('bg-frost-primary/5');
    expect(l).toContain('from-white');
    expect(d).toContain('from-gray-800/90');
    expect(new Set([w, l, d]).size).toBe(3);
  });

  it('drops the gradient text treatment in winter', () => {
    expect(standingsTitleClasses(winter)).toContain('text-[hsl(var(--foreground))]');
    expect(standingsTitleClasses(dark)).toContain('bg-clip-text');
  });

  it('leaves the description to the card token outside winter', () => {
    // Light and dark both resolve to `--muted-foreground`, which
    // `CardDescription` already applies, so neither needs a class of its own.
    expect(standingsDescriptionClasses(winter)).toContain('muted-foreground');
    expect(standingsDescriptionClasses(light)).toBe('');
    expect(standingsDescriptionClasses(dark)).toBe('');
  });

  it('leaves the content transparent in winter', () => {
    expect(standingsContentClasses(winter)).toBe('bg-transparent');
    expect(standingsContentClasses(dark)).toContain('from-white');
  });
});

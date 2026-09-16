import { describe, expect, it } from 'vitest';

import {
  careerCardClasses,
  careerContentClasses,
  careerExportButtonClasses,
  careerHeaderClasses,
  careerHeaderPadding,
  careerTitleClasses,
} from '../careerCardStyles';

const winter = { isWinterTheme: true, isLight: false };
const light = { isWinterTheme: false, isLight: true };
const dark = { isWinterTheme: false, isLight: false };

// Three themes, and winter wins wherever they overlap. These were nested
// ternaries inside the two career cards' cn() calls before they moved here —
// which is where the complexity warning on the rankings card came from.
describe('career card theme classes', () => {
  it('gives the card a frost border in winter and a blue one otherwise', () => {
    expect(careerCardClasses(winter)[0]).toContain('border-frost-border');
    expect(careerCardClasses(dark)[0]).toContain('border-blue-300');
    expect(careerCardClasses(light)[0]).toContain('border-blue-300');
  });

  it('adds the warm gradient only to the light theme', () => {
    expect(careerCardClasses(light)[1]).not.toBe('');
    expect(careerCardClasses(dark)[1]).toBe('');
    expect(careerCardClasses(winter)[1]).toBe('');
  });

  it('picks a different header background for each of the three themes', () => {
    const [w, l, d] = [winter, light, dark].map((t) => careerHeaderClasses(t)[0]);
    expect(new Set([w, l, d]).size).toBe(3);
    expect(w).toContain('hsl(var(--card))');
    expect(l).toContain('from-white');
    expect(d).toContain('from-gray-800/90');
  });

  it('borders the header with frost in winter and blue otherwise', () => {
    expect(careerHeaderClasses(winter)[1]).toContain('border-frost-border');
    expect(careerHeaderClasses(dark)[1]).toContain('border-blue-100');
  });

  it('sits the body on the card surface in winter and a gradient otherwise', () => {
    expect(careerContentClasses(winter)).toContain('hsl(var(--card))');
    expect(careerContentClasses(dark)).toContain('from-muted');
  });

  it('matches the Export button border to the card', () => {
    expect(careerExportButtonClasses(winter)).toContain('border-frost-border');
    expect(careerExportButtonClasses(dark)).toContain('border-muted-foreground');
  });
});

describe('career card sizing', () => {
  it('tightens the header padding on a phone', () => {
    expect(careerHeaderPadding(true)).not.toBe(careerHeaderPadding(false));
    expect(careerHeaderPadding(true)).toContain('py-2.5');
  });

  it('shrinks the title on a phone but keeps its gradient in both', () => {
    const [phone, desktop] = [careerTitleClasses(true), careerTitleClasses(false)];
    expect(phone).toContain('text-lg');
    expect(desktop).toContain('text-xl sm:text-2xl');
    // The gradient is not a size choice, so it is on both.
    expect(phone.join(' ')).toContain('bg-clip-text');
    expect(desktop.join(' ')).toContain('bg-clip-text');
  });
});

import { describe, expect, it } from 'vitest';

import {
  getDivisionBadgeColor,
  getDivisionGradientClass,
  getDivisionHeaderClass,
  getDivisionSoftClasses,
  getDivisionTextClass,
} from '../divisionColors';
import { getDivisionHexColor } from '../divisionHexColors';
import {
  formatPowerScore,
  getPowerScoreBackgroundColor,
  getPowerScoreBorderColor,
  getPowerScoreColor,
  getPowerScoreDescription,
  getPowerScoreRingColor,
} from '../powerScoreColors';
import { getStandingsPercentageColor } from '../standingsColors';
import { getTeamColor } from '../teamColors';
import { getTrendArrow, getTrendColor } from '../trendColors';
import { getWinPercentageBackgroundColor, getWinPercentageColor } from '../winPercentageColors';

describe('color modules table-driven coverage', () => {
  it.each([
    { input: null, expected: '#6b7280' },
    { input: 'Competitive Alpha', expected: '#dc2626' },
    { input: 'Intermediate Alpha', expected: '#d97706' },
    { input: 'Recreational Alpha', expected: '#16a34a' },
    { input: 'Unknown', expected: '#6b7280' },
  ])('getDivisionHexColor light mode: $input', ({ input, expected }) => {
    expect(getDivisionHexColor(input)).toBe(expected);
  });

  it.each([
    { input: null, expected: '#9ca3af' },
    { input: 'Competitive Alpha', expected: '#ef4444' },
    { input: 'Intermediate Alpha', expected: '#f59e0b' },
    { input: 'Recreational Alpha', expected: '#22c55e' },
  ])('getDivisionHexColor dark mode: $input', ({ input, expected }) => {
    expect(getDivisionHexColor(input, true)).toBe(expected);
  });

  it('returns deterministic team color values and theme variants', () => {
    const light = getTeamColor('team-123');
    const dark = getTeamColor('team-123', true);

    expect(light).toMatch(/^hsl\(\d{1,3}, 65%, 45%\)$/);
    expect(dark).toMatch(/^hsl\(\d{1,3}, 70%, 65%\)$/);
    expect(light).not.toBe(dark);
    expect(getTeamColor('team-123')).toBe(light);
  });

  it.each([
    {
      fn: getDivisionGradientClass,
      input: 'Competitive',
      fragment: 'via-[hsl(var(--competitive-soft)/0.06)]',
    },
    {
      fn: getDivisionHeaderClass,
      input: 'Intermediate',
      fragment: 'border-[hsl(var(--intermediate-soft)/0.35)]',
    },
    {
      fn: getDivisionTextClass,
      input: 'Recreational',
      fragment: 'text-[hsl(var(--recreational-soft-text))]',
    },
    {
      fn: getDivisionBadgeColor,
      input: 'Hidden',
      fragment: 'bg-[hsl(var(--competitive-soft)/0.15)]',
    },
    { fn: getDivisionBadgeColor, input: 'Unknown', fragment: 'bg-muted' },
  ])('division classes include expected fragment for $input', ({ fn, input, fragment }) => {
    expect(fn(input)).toContain(fragment);
  });

  // The soft tone fails 4.5:1 as text on a light page, so text and button labels use
  // the darker `-soft-text` token. Fills and borders keep the soft tone.
  it.each(['competitive', 'intermediate', 'recreational'])(
    'soft text and button classes for %s read the -soft-text token',
    (division) => {
      const { text, button } = getDivisionSoftClasses(division);
      expect(text).toContain(`text-[hsl(var(--${division}-soft-text))]`);
      expect(button).toContain(`text-[hsl(var(--${division}-soft-text))]`);
    }
  );

  it.each([
    {
      score: null,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      border: 'border-border',
      description: 'No Data',
      formatted: '—',
      ring: 'stroke-muted',
    },
    {
      score: 85,
      color: 'text-yellow-700 dark:text-yellow-500',
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      border: 'border-yellow-300 dark:border-yellow-700',
      description: 'Elite Performance',
      formatted: '85.0',
      ring: 'stroke-yellow-500',
    },
    {
      score: 70,
      color: 'text-green-700 dark:text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-300 dark:border-green-700',
      description: 'Excellent',
      formatted: '70.0',
      ring: 'stroke-green-500',
    },
    {
      score: 60,
      color: 'text-blue-600 dark:text-blue-500',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      border: 'border-blue-300 dark:border-blue-700',
      description: 'Very Good',
      formatted: '60.0',
      ring: 'stroke-blue-500',
    },
    {
      score: 50,
      color: 'text-orange-700 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-900/20',
      border: 'border-orange-300 dark:border-orange-700',
      description: 'Average',
      formatted: '50.0',
      ring: 'stroke-orange-500',
    },
    {
      score: 40,
      color: 'text-amber-700 dark:text-amber-500',
      bg: 'bg-amber-100 dark:bg-amber-900/20',
      border: 'border-amber-300 dark:border-amber-700',
      description: 'Below Average',
      formatted: '40.0',
      ring: 'stroke-amber-500',
    },
    {
      score: 39.9,
      color: 'text-pink-600 dark:text-pink-500',
      bg: 'bg-pink-100 dark:bg-pink-900/20',
      border: 'border-pink-300 dark:border-pink-700',
      description: 'Poor',
      formatted: '39.9',
      ring: 'stroke-pink-500',
    },
    {
      score: 15,
      color: 'text-red-600 dark:text-red-500',
      bg: 'bg-red-100 dark:bg-red-900/20',
      border: 'border-red-300 dark:border-red-700',
      description: 'Critical Performance',
      formatted: '15.0',
      ring: 'stroke-red-500',
    },
  ])(
    'power score buckets for $score',
    ({ score, color, bg, border, description, formatted, ring }) => {
      expect(getPowerScoreColor(score)).toBe(color);
      expect(getPowerScoreBackgroundColor(score)).toBe(bg);
      expect(getPowerScoreBorderColor(score)).toBe(border);
      expect(getPowerScoreDescription(score)).toBe(description);
      expect(formatPowerScore(score)).toBe(formatted);
      expect(getPowerScoreRingColor(score)).toBe(ring);
    }
  );

  // The gauge ring used to carry its own 75/60/45 thresholds while the number
  // inside it used 85/70/60/50, so the two could disagree. They share bands now.
  it.each([
    { score: 90, ring: 'stroke-yellow-500' },
    { score: 75, ring: 'stroke-green-500' },
    { score: 65, ring: 'stroke-blue-500' },
    { score: 55, ring: 'stroke-orange-500' },
    { score: 45, ring: 'stroke-amber-500' },
    { score: 35, ring: 'stroke-pink-500' },
    { score: 25, ring: 'stroke-purple-500' },
    { score: 10, ring: 'stroke-red-500' },
  ])('ring colour tracks the text band at $score', ({ score, ring }) => {
    expect(getPowerScoreRingColor(score)).toBe(ring);
    // Both helpers must name the same hue for the same score.
    const hue = ring.replace('stroke-', '').replace('-500', '');
    expect(getPowerScoreColor(score)).toContain(hue);
  });

  it('treats undefined the same as null in both power score helpers', () => {
    // Bound to a variable rather than passed as a literal: an inline `undefined`
    // in the final argument position is flagged as redundant, but the point here
    // is that a genuinely absent value is handled.
    const absent: number | undefined = undefined;
    expect(getPowerScoreRingColor(absent)).toBe('stroke-muted');
    expect(formatPowerScore(absent)).toBe('—');
  });

  it.each([
    {
      input: 0.8,
      winColor: 'text-green-700 dark:text-green-500',
      winBg: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      input: 0.6,
      winColor: 'text-blue-600 dark:text-blue-500',
      winBg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      input: 0.45,
      winColor: 'text-orange-700 dark:text-orange-400',
      winBg: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      input: 0.2,
      winColor: 'text-red-700 dark:text-red-500',
      winBg: 'bg-red-100 dark:bg-red-900/20',
    },
  ])('win% buckets for $input', ({ input, winColor, winBg }) => {
    expect(getWinPercentageColor(input)).toBe(winColor);
    expect(getWinPercentageBackgroundColor(input)).toBe(winBg);
  });

  // The standings run on a 0-100 scale and break at 40, where
  // getWinPercentageColor runs on 0-1 and breaks at 45. Pinning both boundaries
  // is what stops the two drifting back together.
  it.each([
    { input: 100, expected: 'text-green-700 dark:text-green-500' },
    { input: 75, expected: 'text-green-700 dark:text-green-500' },
    { input: 74.9, expected: 'text-blue-600 dark:text-blue-500' },
    { input: 60, expected: 'text-blue-600 dark:text-blue-500' },
    { input: 59.9, expected: 'text-orange-700 dark:text-orange-400' },
    { input: 45, expected: 'text-orange-700 dark:text-orange-400' },
    { input: 40, expected: 'text-orange-700 dark:text-orange-400' },
    { input: 39.9, expected: 'text-red-700 dark:text-red-500' },
    { input: 0, expected: 'text-red-700 dark:text-red-500' },
  ])('standings percentage buckets for $input', ({ input, expected }) => {
    expect(getStandingsPercentageColor(input)).toBe(expected);
  });

  it.each([
    { delta: 10, color: 'text-emerald-600 dark:text-emerald-400', arrow: '↑' },
    { delta: 5, color: 'text-green-600 dark:text-green-500', arrow: '↑' },
    { delta: 2, color: 'text-green-500 dark:text-green-400', arrow: '↑' },
    { delta: 0, color: 'text-muted-foreground', arrow: '→' },
    { delta: -4, color: 'text-orange-500 dark:text-orange-400', arrow: '↓' },
    { delta: -10, color: 'text-red-600 dark:text-red-400', arrow: '↓' },
  ])('trend formatting for delta $delta', ({ delta, color, arrow }) => {
    expect(getTrendColor(delta)).toBe(color);
    expect(getTrendArrow(delta)).toBe(arrow);
  });
});

import { describe, expect, it } from 'vitest';

import {
  getChampionshipBackgroundColor,
  getChampionshipColor,
  getRunnerUpColor,
} from '../championshipColors';
import {
  getDivisionBadgeColor,
  getDivisionGradientClass,
  getDivisionHeaderClass,
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
import { getSweepRateColor } from '../sweepRateColors';
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
      fragment: 'text-[hsl(var(--recreational-soft))]',
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

  it.each([
    {
      score: null,
      color: 'text-gray-400 dark:text-gray-500',
      bg: 'bg-gray-100 dark:bg-gray-900/20',
      border: 'border-gray-300 dark:border-gray-700',
      description: 'No Data',
      formatted: '—',
      ring: 'stroke-muted',
    },
    {
      score: 85,
      color: 'text-yellow-600 dark:text-yellow-500',
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      border: 'border-yellow-300 dark:border-yellow-700',
      description: 'Elite Performance',
      formatted: '85.0',
      ring: 'stroke-yellow-500',
    },
    {
      score: 70,
      color: 'text-green-600 dark:text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-300 dark:border-green-700',
      description: 'Excellent',
      formatted: '70.0',
      ring: 'stroke-green-500',
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
      count: 3,
      text: 'text-yellow-600 dark:text-yellow-500 font-semibold',
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      runnerUp: 'text-gray-600 dark:text-gray-400 font-medium',
    },
    {
      count: 1,
      text: 'text-yellow-700 dark:text-yellow-400 font-medium',
      bg: 'bg-yellow-50 dark:bg-yellow-900/10',
      runnerUp: 'text-gray-600 dark:text-gray-400',
    },
    {
      count: 0,
      text: 'text-gray-600 dark:text-gray-400',
      bg: '',
      runnerUp: 'text-gray-500 dark:text-gray-500',
    },
  ])('championship/runners-up buckets for $count', ({ count, text, bg, runnerUp }) => {
    expect(getChampionshipColor(count)).toBe(text);
    expect(getChampionshipBackgroundColor(count)).toBe(bg);
    expect(getRunnerUpColor(count)).toBe(runnerUp);
  });

  it.each([
    {
      input: 0.8,
      winColor: 'text-green-600 dark:text-green-500',
      winBg: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      input: 0.6,
      winColor: 'text-blue-600 dark:text-blue-500',
      winBg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      input: 0.45,
      winColor: 'text-orange-500 dark:text-orange-400',
      winBg: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      input: 0.2,
      winColor: 'text-red-600 dark:text-red-500',
      winBg: 'bg-red-100 dark:bg-red-900/20',
    },
  ])('win% buckets for $input', ({ input, winColor, winBg }) => {
    expect(getWinPercentageColor(input)).toBe(winColor);
    expect(getWinPercentageBackgroundColor(input)).toBe(winBg);
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

  it('keeps sweep rate utility behavior aligned with centralized export', () => {
    expect(getSweepRateColor(null)).toBe('text-muted-foreground');
    expect(getSweepRateColor(40)).toBe('text-blue-600 dark:text-blue-500');
  });
});

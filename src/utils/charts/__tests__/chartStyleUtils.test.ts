import { renderHook } from '@testing-library/react';
import { useTheme } from 'next-themes';
import { describe, expect, it, vi } from 'vitest';

import { getChartColors, useChartColors } from '../chartStyleUtils';

vi.mock('next-themes', () => ({ useTheme: vi.fn() }));

const mockedUseTheme = vi.mocked(useTheme);

/** Minimal next-themes shape — only `resolvedTheme` is read. */
const withTheme = (resolvedTheme: string) =>
  mockedUseTheme.mockReturnValue({ resolvedTheme } as unknown as ReturnType<typeof useTheme>);

describe('getChartColors', () => {
  it('draws on a white ground for a light page', () => {
    const colors = getChartColors(false);
    expect(colors.background).toBe('#ffffff');
    expect(colors.gridColor).toBe('#e5e7eb');
    expect(colors.textColor).toBe('#334155');
  });

  it('draws on a dark ground for a dark page', () => {
    const colors = getChartColors(true);
    expect(colors.background).toBe('#1f2937');
    expect(colors.gridColor).toBe('#374151');
    expect(colors.textColor).toBe('#e5e7eb');
  });

  it('keeps the win, loss and power-score bar colours on both grounds', () => {
    // These read the same against either ground and must not drift apart.
    expect(getChartColors(true).winLoss.win).toBe(getChartColors(false).winLoss.win);
    expect(getChartColors(true).winLoss.loss).toBe(getChartColors(false).winLoss.loss);
    expect(getChartColors(true).powerScore.bar).toBe(getChartColors(false).powerScore.bar);
  });
});

describe('useChartColors', () => {
  it('uses the light colours for the light theme', () => {
    withTheme('light');
    expect(renderHook(() => useChartColors()).result.current.background).toBe('#ffffff');
  });

  it('uses the dark colours for the dark theme', () => {
    withTheme('dark');
    expect(renderHook(() => useChartColors()).result.current.background).toBe('#1f2937');
  });

  it('uses the dark colours for the winter theme, which is also a dark page', () => {
    // The bug this replaces: `resolvedTheme === 'dark'` is false under
    // `winter-frozen`, so every chart drew a white ground on a dark page.
    withTheme('winter-frozen');
    expect(renderHook(() => useChartColors()).result.current.background).toBe('#1f2937');
  });
});

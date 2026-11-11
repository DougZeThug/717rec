import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PercentileFromResult } from '@/components/ui/PercentileBadge';
import type { PercentileResult } from '@/utils/percentileUtils';

const ranked = (rank: number, percentile: number, total = 10): PercentileResult => ({
  value: percentile,
  percentile,
  rank,
  total,
});

describe('PercentileFromResult pill', () => {
  // jsdom does no layout or colour, so this pins the classes. In the light theme
  // the -600 text on its own -500/20 tint measured 2.57:1 (yellow) to 4.12:1
  // (blue), under the 4.5:1 text minimum. The dark-theme colours do not change.
  it.each([
    ['1st', 95, 'text-yellow-800', 'text-yellow-600', 'dark:text-yellow-400'],
    ['3rd', 80, 'text-emerald-800', 'text-emerald-600', 'dark:text-emerald-400'],
    ['5th', 60, 'text-blue-700', 'text-blue-600', 'dark:text-blue-400'],
    ['9th', 10, 'text-red-700', 'text-red-600', 'dark:text-red-400'],
  ])(
    'paints the %s pill in a light-theme colour that reads at 4.5:1',
    (label, pct, light, old, dark) => {
      const rank = Number.parseInt(label, 10);
      render(<PercentileFromResult result={ranked(rank, pct)} />);

      const pill = screen.getByText(label);
      expect(pill).toHaveClass(light, dark);
      expect(pill).not.toHaveClass(old);
    }
  );

  it('keeps the grey pill for the below-average tier', () => {
    render(<PercentileFromResult result={ranked(7, 30)} />);

    expect(screen.getByText('7th')).toHaveClass('bg-muted', 'text-muted-foreground');
  });

  // The default size was 11px, under the 12px floor for text a reader needs.
  it('draws the default (xs) pill at 12px', () => {
    render(<PercentileFromResult result={ranked(2, 95)} />);

    const pill = screen.getByText('2nd');
    expect(pill).toHaveClass('text-xs');
    expect(pill).not.toHaveClass('text-2xs');
  });

  // The "of 10 teams" part lived only in a hover tooltip, which a screen reader
  // never opens. It is now hidden text inside the pill; the visible "3rd" stays.
  it('gives a screen reader the tooltip words after the rank', () => {
    render(<PercentileFromResult result={ranked(3, 80)} statName="Win %" />);

    const pill = screen.getByText('3rd');
    const hidden = screen.getByText('of 10 teams in Win %');
    expect(hidden).toHaveClass('sr-only');
    expect(pill).toContainElement(hidden);
    expect(pill).toHaveTextContent('3rd of 10 teams in Win %');
  });

  it('leaves out the stat name when there is none', () => {
    render(<PercentileFromResult result={ranked(4, 80, 12)} />);

    expect(screen.getByText('of 12 teams')).toHaveClass('sr-only');
  });

  it('renders nothing for a team with nothing to measure', () => {
    const { container } = render(
      <PercentileFromResult result={{ value: 0, percentile: 0, rank: 0, total: 0 }} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});

import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ComparisonStatRow } from '@/components/compare/ComparisonStatRow';
import type { PercentileResult } from '@/utils/percentileUtils';

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

/** What useLeaguePercentiles gives a team that has never played a career match. */
const UNMEASURED: PercentileResult = { value: 0, percentile: 0, rank: 0, total: 0 };

const ranked = (rank: number, total: number, percentile: number): PercentileResult => ({
  value: percentile,
  percentile,
  rank,
  total,
});

const setup = (props: Partial<React.ComponentProps<typeof ComparisonStatRow>> = {}) =>
  render(
    <ComparisonStatRow
      label="Win %"
      value1="62.5"
      value2="41.0"
      numericValue1={62.5}
      numericValue2={41}
      suffix="%"
      {...props}
    />
  );

describe('ComparisonStatRow', () => {
  it('shows the rank for a team that has been measured', () => {
    setup({ percentile1: ranked(3, 12, 80), percentile2: ranked(9, 12, 25) });

    expect(screen.getByText('3rd')).toBeInTheDocument();
    expect(screen.getByText('9th')).toBeInTheDocument();
  });

  // A team with no career match is not ranked last, it is not ranked at all.
  // Compare used to paint it a red "0%" pill, which reads as worst in the
  // league. The team page has always shown nothing for this.
  it('shows no badge for a team with nothing to measure', () => {
    setup({ percentile1: UNMEASURED, percentile2: UNMEASURED });

    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('keeps the measured side ranked when only the other side is unmeasured', () => {
    setup({ percentile1: ranked(1, 12, 100), percentile2: UNMEASURED });

    expect(screen.getByText('1st')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('shows no badge when the row asks for none', () => {
    setup({
      percentile1: ranked(3, 12, 80),
      percentile2: ranked(9, 12, 25),
      showPercentiles: false,
    });

    expect(screen.queryByText('3rd')).not.toBeInTheDocument();
    expect(screen.queryByText('9th')).not.toBeInTheDocument();
  });

  it('still shows both values and the label', () => {
    setup({ percentile1: UNMEASURED, percentile2: UNMEASURED });

    expect(screen.getByText('Win %')).toBeInTheDocument();
    expect(screen.getByText('62.5%')).toBeInTheDocument();
    expect(screen.getByText('41.0%')).toBeInTheDocument();
  });

  // --primary is a fill colour. As text on a card it read under 4.5:1 in the
  // dark theme; text-primary-text is the text shade of the same blue.
  it('draws the better value in the primary text colour, not the fill colour', () => {
    setup();

    const better = screen.getByText('62.5%');
    expect(better).toHaveClass('text-primary-text');
    expect(better).not.toHaveClass('text-primary');
    expect(screen.getByText('41.0%')).not.toHaveClass('text-primary-text');

    // A lower value that is better marks the second team instead.
    setup({
      value1: '9',
      value2: '4',
      numericValue1: 9,
      numericValue2: 4,
      higherIsBetter: false,
      suffix: '',
    });
    expect(screen.getByText('4')).toHaveClass('text-primary-text');
    expect(screen.getByText('4')).not.toHaveClass('text-primary');
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockIsMobile = false;
vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('../../StatsCharts', () => ({
  default: ({ rankings, chartLimit }: { rankings: unknown[]; chartLimit: number }) => (
    <div data-testid="stats-charts" data-count={rankings.length} data-limit={chartLimit} />
  ),
}));

import { Ranking } from '@/types';

import StatsChartsSection from '../StatsChartsSection';

const rankings = [{ teamId: 'a' }, { teamId: 'b' }] as Ranking[];

describe('StatsChartsSection', () => {
  beforeEach(() => {
    mockIsMobile = false;
  });

  it('passes the rankings through to StatsCharts', () => {
    render(<StatsChartsSection rankings={rankings} />);
    expect(screen.getByTestId('stats-charts')).toHaveAttribute('data-count', '2');
  });

  it('uses a chart limit of 8 on desktop', () => {
    render(<StatsChartsSection rankings={rankings} />);
    expect(screen.getByTestId('stats-charts')).toHaveAttribute('data-limit', '8');
  });

  it('uses a chart limit of 5 on mobile', () => {
    mockIsMobile = true;
    render(<StatsChartsSection rankings={rankings} />);
    expect(screen.getByTestId('stats-charts')).toHaveAttribute('data-limit', '5');
  });
});

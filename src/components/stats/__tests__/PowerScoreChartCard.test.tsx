import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PowerScoreChartCard from '../PowerScoreChartCard';

const mocks = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mocks.isMobile }));
vi.mock('@/components/ui/animated-chart-wrapper', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../PowerScoreChart', () => ({
  default: ({ data }: { data: { name: string }[] }) => (
    <div data-testid="chart">{data.map((d) => d.name).join(',')}</div>
  ),
}));

const data = [
  { name: 'Tigers', powerScore: 82 },
  { name: 'Lions', powerScore: 71 },
];

describe('PowerScoreChartCard', () => {
  beforeEach(() => {
    mocks.isMobile = false;
  });

  it('shows the top 8 title, the subtitle and the chart on a wide screen', async () => {
    render(<PowerScoreChartCard data={data} />);

    expect(screen.getByText('Top 8 Power Scores')).toBeInTheDocument();
    expect(screen.getByText('Elite team performance ranking')).toBeInTheDocument();
    expect(await screen.findByTestId('chart')).toHaveTextContent('Tigers,Lions');
  });

  it('shows the top 5 title and drops the subtitle on a phone', async () => {
    mocks.isMobile = true;
    render(<PowerScoreChartCard data={data} />);

    expect(screen.getByText('Top 5 Power Scores')).toBeInTheDocument();
    expect(screen.queryByText('Elite team performance ranking')).not.toBeInTheDocument();
    expect(await screen.findByTestId('chart')).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TrafficMiniChart from '../TrafficMiniChart';

type Row = {
  day: string;
  visitors: number;
  ios_visitors: number;
  android_visitors: number;
  other_visitors: number;
};

let query: { data: Row[] | undefined; isLoading: boolean; error: Error | null } = {
  data: [],
  isLoading: false,
  error: null,
};

vi.mock('@/hooks/useDailyTraffic', () => ({ useDailyTraffic: () => query }));

/** jsdom has no layout, so the responsive box would collapse to nothing. */
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <actual.ResponsiveContainer width={600} height={160}>
        {children as React.ReactElement}
      </actual.ResponsiveContainer>
    ),
  };
});

const day = (iso: string, visitors: number): Row => ({
  day: iso,
  visitors,
  ios_visitors: visitors,
  android_visitors: 0,
  other_visitors: 0,
});

describe('TrafficMiniChart', () => {
  beforeEach(() => {
    query = { data: [], isLoading: false, error: null };
  });

  it('draws no chart before any visit has been recorded', () => {
    render(<TrafficMiniChart />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the day and its visitor count in a tooltip when the line is hovered', async () => {
    query = {
      data: Array.from({ length: 10 }, (_, i) =>
        day(`2026-09-${String(i + 1).padStart(2, '0')}`, 2)
      ),
      isLoading: false,
      error: null,
    };
    const { container } = render(<TrafficMiniChart />);

    const chart = container.querySelector('.recharts-wrapper') as HTMLElement;
    fireEvent.mouseMove(chart, { clientX: 300, clientY: 60 });

    // Every day in the fixture has 2 visitors.
    const item = (await screen.findByText('Visitors')).closest('.recharts-tooltip-item');
    expect(item).toHaveTextContent(/Visitors\s*:?\s*2/);
    expect(
      screen.getByText(/^Sep \d+$/, { selector: '.recharts-tooltip-label' })
    ).toBeInTheDocument();
  });

  // On a 320-390px phone the 10px tick labels were hard to read, and the -16px left margin
  // pulled the y labels under the card edge. The plot area now starts right after the 30px
  // y axis (it started at 14px).
  it('draws 12px axis labels and keeps the y axis inside the chart', () => {
    query = {
      data: Array.from({ length: 10 }, (_, i) =>
        day(`2026-09-${String(i + 1).padStart(2, '0')}`, 20 + i * 5)
      ),
      isLoading: false,
      error: null,
    };
    const { container } = render(<TrafficMiniChart />);

    const yLabels = [...container.querySelectorAll('.recharts-yAxis-tick-labels text')];
    const xLabels = [...container.querySelectorAll('.recharts-xAxis-tick-labels text')];
    expect(yLabels.length).toBeGreaterThan(0);
    expect(xLabels.length).toBeGreaterThan(0);
    for (const label of [...yLabels, ...xLabels]) {
      expect(label).toHaveAttribute('font-size', '12');
    }

    const gridLine = container.querySelector('.recharts-cartesian-grid-horizontal line');
    expect(gridLine).toHaveAttribute('x1', '30');
  });

  it('summarises the line for screen readers, with the date range and recent total', () => {
    query = {
      data: Array.from({ length: 10 }, (_, i) =>
        day(`2026-09-${String(i + 1).padStart(2, '0')}`, 2)
      ),
      isLoading: false,
      error: null,
    };
    render(<TrafficMiniChart />);

    expect(
      screen.getByRole('img', {
        name: 'Line chart of daily visitors from Sep 1 to Sep 10. The 7 most recent days with visits had 14 visitors in total.',
      })
    ).toBeInTheDocument();
  });
});

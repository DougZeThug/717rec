import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import PowerScoreChart from '../PowerScoreChart';

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
vi.mock('@/utils/charts/chartStyleUtils', () => ({
  useChartColors: () => ({
    background: '#ffffff',
    gridColor: '#e5e7eb',
    textColor: '#334155',
    mutedTextColor: '#64748b',
    powerScore: { bar: '#a288f5', highlight: '#805fff', background: '#f1f0fb' },
  }),
}));

/** jsdom has no layout, so the responsive box would collapse to nothing. */
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <actual.ResponsiveContainer width={600} height={240}>
        {children as React.ReactElement}
      </actual.ResponsiveContainer>
    ),
  };
});

describe('PowerScoreChart', () => {
  it('says scores come after matches when nobody has one yet', () => {
    render(<PowerScoreChart data={[{ name: 'Tigers', powerScore: 0 }]} />);

    expect(screen.getByText('Power scores available after matches')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('is one picture with a text summary of each team and its score', () => {
    render(
      <PowerScoreChart
        data={[
          { name: 'Tigers', powerScore: 82.5 },
          { name: 'Lions', powerScore: 71 },
        ]}
      />
    );

    expect(
      screen.getByRole('img', {
        name: /^Bar chart of power scores out of 100, highest first\. Tigers .*82.*; Lions .*71.*\.$/,
      })
    ).toBeInTheDocument();
  });
});

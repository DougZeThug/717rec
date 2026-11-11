import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { DivisionStrength } from '@/hooks/useLeagueInsights';

vi.mock('@/utils/charts/chartStyleUtils', () => ({
  useChartColors: () => ({
    background: '#ffffff',
    gridColor: '#e5e7eb',
    textColor: '#334155',
    mutedTextColor: '#64748b',
    powerScore: { bar: '#a288f5', highlight: '#805fff', background: '#f1f0fb' },
    winLoss: { win: '#10b981', loss: '#ef4444', text: '#334155' },
  }),
}));

/**
 * Recharts measures its parent, and jsdom has no layout, so `ResponsiveContainer`
 * would collapse to 0x0 and draw no axis. Give it a fixed box instead; every
 * other part of the chart is the real thing.
 */
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 600, height: 240 }}>
        <actual.ResponsiveContainer width={600} height={240}>
          {children as React.ReactElement}
        </actual.ResponsiveContainer>
      </div>
    ),
  };
});

import DivisionStrengthChart from '../DivisionStrengthChart';

const divisions: DivisionStrength[] = [
  { division: 'Competitive', avgPowerScore: 82, avgWinPct: 60, teamCount: 8, avgSos: 0.5 },
  { division: 'Intermediate', avgPowerScore: 71, avgWinPct: 50, teamCount: 10, avgSos: 0.4 },
];

describe('DivisionStrengthChart axes', () => {
  // The 0-100 scale under the bars was 11px, under the 12px floor for text a
  // reader needs. The division names were already 12px.
  it('draws both axes at 12px', () => {
    const { container } = render(<DivisionStrengthChart divisions={divisions} />);

    const scale = container.querySelectorAll(
      '.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value'
    );
    const names = container.querySelectorAll(
      '.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value'
    );
    expect(scale.length).toBeGreaterThan(0);
    expect(names.length).toBe(2);
    for (const tick of [...scale, ...names]) expect(tick).toHaveAttribute('font-size', '12');
  });
});

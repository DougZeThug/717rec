import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DivisionStrength } from '@/hooks/useLeagueInsights';

const mockUseChartColors = vi.hoisted(() => vi.fn());

vi.mock('@/utils/charts/chartStyleUtils', () => ({
  useChartColors: () => mockUseChartColors(),
}));

import DivisionStrengthChart from '../DivisionStrengthChart';

const cannedColors = {
  background: '#ffffff',
  gridColor: '#e5e7eb',
  textColor: '#334155',
  mutedTextColor: '#64748b',
  powerScore: { bar: '#a288f5', highlight: '#805fff', background: '#f1f0fb' },
  winLoss: { win: '#10b981', loss: '#ef4444', text: '#334155' },
};

const divisionsFixture: DivisionStrength[] = [
  { division: 'Competitive', avgPowerScore: 82, avgWinPct: 60, teamCount: 8, avgSos: 0.5 },
  { division: 'Intermediate', avgPowerScore: 71, avgWinPct: 50, teamCount: 10, avgSos: 0.4 },
];

describe('DivisionStrengthChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChartColors.mockReturnValue(cannedColors);
  });

  it('returns null (renders nothing) when there are no divisions', () => {
    const { container } = render(<DivisionStrengthChart divisions={[]} />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Division Strength')).not.toBeInTheDocument();
  });

  it('renders the heading and the chart container when populated', () => {
    const { container } = render(<DivisionStrengthChart divisions={divisionsFixture} />);

    // The heading only renders past the empty-array early return.
    expect(screen.getByRole('heading', { name: 'Division Strength' })).toBeInTheDocument();

    // Recharts' ResponsiveContainer reports 0 width in jsdom so the inner SVG /
    // axis labels never paint; assert the chart wrapper mounted instead.
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('reads theme-aware colors from useChartColors', () => {
    render(<DivisionStrengthChart divisions={divisionsFixture} />);

    expect(mockUseChartColors).toHaveBeenCalled();
  });
});

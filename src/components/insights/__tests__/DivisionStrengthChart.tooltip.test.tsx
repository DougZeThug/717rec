import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { DivisionStrength } from '@/hooks/useLeagueInsights';

vi.mock('@/hooks/useChartColors', () => ({
  useChartColors: () => ({
    background: '#ffffff',
    gridColor: '#e5e7eb',
    textColor: '#334155',
    mutedTextColor: '#64748b',
    powerScore: { bar: '#a288f5', highlight: '#805fff', background: '#f1f0fb' },
    winLoss: { win: '#10b981', loss: '#ef4444', text: '#334155' },
  }),
}));

const tooltipState = vi.hoisted(() => ({
  active: true,
  payload: [] as Array<{ payload: unknown }>,
}));

/**
 * jsdom has no pointer hover, so the real Recharts tooltip never opens. This
 * Tooltip draws the chart's own `content` element at once, with the state
 * Recharts would pass on hover. The rest of the chart is a plain box.
 */
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ...actual,
    ResponsiveContainer: Passthrough,
    BarChart: Passthrough,
    Bar: Passthrough,
    Tooltip: ({ content }: { content: React.ReactElement }) => (
      <div data-testid="tooltip">
        {React.cloneElement(content, {
          active: tooltipState.active,
          payload: tooltipState.payload,
        } as Record<string, unknown>)}
      </div>
    ),
  };
});

import DivisionStrengthChart from '../DivisionStrengthChart';

const divisions: DivisionStrength[] = [
  { division: 'Competitive', avgPowerScore: 82, avgWinPct: 60, teamCount: 8, avgSos: 0.5 },
  { division: 'Intermediate', avgPowerScore: 71, avgWinPct: 50, teamCount: 10, avgSos: 0.4 },
];

describe('DivisionStrengthChart tooltip', () => {
  it('shows the division, power score, win rate and team count on hover', () => {
    tooltipState.active = true;
    tooltipState.payload = [{ payload: divisions[0] }];

    render(<DivisionStrengthChart divisions={divisions} />);

    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toHaveTextContent('Competitive');
    expect(tooltip).toHaveTextContent('Avg Power Score: 82');
    expect(tooltip).toHaveTextContent('Avg Win Rate: 60%');
    expect(tooltip).toHaveTextContent('Teams: 8');
  });

  it('draws nothing when no bar is hovered', () => {
    tooltipState.active = false;
    tooltipState.payload = [{ payload: divisions[0] }];

    render(<DivisionStrengthChart divisions={divisions} />);

    expect(screen.getByTestId('tooltip')).toBeEmptyDOMElement();
  });

  it('draws nothing when the hover has no data', () => {
    tooltipState.active = true;
    tooltipState.payload = [];

    render(<DivisionStrengthChart divisions={divisions} />);

    expect(screen.getByTestId('tooltip')).toBeEmptyDOMElement();
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import WinLossTooltip from '../WinLossTooltip';

type TooltipPayload = React.ComponentProps<typeof WinLossTooltip>['payload'];

const payload = [
  {
    dataKey: 'wins',
    name: 'Wins',
    value: 7,
    color: '#22c55e',
    payload: { tooltipName: 'The Baggers' },
  },
  {
    dataKey: 'losses',
    name: 'Losses',
    value: 2,
    color: '#ef4444',
    payload: { tooltipName: 'The Baggers' },
  },
] as unknown as TooltipPayload;

describe('WinLossTooltip', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(
      <WinLossTooltip active={false} payload={payload} label="The Baggers" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when payload is empty', () => {
    const { container } = render(<WinLossTooltip active payload={[]} label="X" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the team name and each series value when active', () => {
    render(<WinLossTooltip active payload={payload} label="fallback-label" />);
    expect(screen.getByText('The Baggers')).toBeInTheDocument();
    expect(screen.getByText('Wins: 7')).toBeInTheDocument();
    expect(screen.getByText('Losses: 2')).toBeInTheDocument();
  });

  it('falls back to the label when tooltipName is missing', () => {
    const noName = [
      { dataKey: 'wins', name: 'Wins', value: 3, color: '#22c55e', payload: {} },
    ] as unknown as TooltipPayload;
    render(<WinLossTooltip active payload={noName} label="Label Team" />);
    expect(screen.getByText('Label Team')).toBeInTheDocument();
  });
});

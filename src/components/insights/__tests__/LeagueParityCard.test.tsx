import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import LeagueParityCard from '../LeagueParityCard';

const parity = (parityIndex: number) => ({
  parityIndex,
  standardDeviation: 7.5,
  topBottomGap: 31.2,
  competitiveTeams: 9,
});

describe('LeagueParityCard', () => {
  it('shows the index, its three detail stats and the team count', () => {
    render(<LeagueParityCard parity={parity(72)} totalTeams={14} />);

    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('31.2')).toBeInTheDocument();
    expect(screen.getByText('9 / 14')).toBeInTheDocument();
  });

  // Each band gets its own word and a colour that reads on light and dark.
  it.each([
    [85, 'Very High', 'text-emerald-600', 'dark:text-emerald-400'],
    [65, 'High', 'text-blue-600', 'dark:text-blue-400'],
    [45, 'Moderate', 'text-amber-600', 'dark:text-amber-400'],
    [25, 'Low', 'text-red-600', 'dark:text-red-400'],
    [5, 'Very Low', 'text-red-600', 'dark:text-red-400'],
  ])('describes an index of %i as %s', (index, label, light, dark) => {
    render(<LeagueParityCard parity={parity(index)} totalTeams={10} />);

    expect(screen.getByText(label)).toHaveClass(light, dark);
  });

  it('fills the bar to the index', () => {
    const { container } = render(<LeagueParityCard parity={parity(60)} totalTeams={10} />);

    expect(container.querySelector('[style*="width: 60%"]')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import PastWinnersDisplay from '../PastWinnersDisplay';

const weeks = [
  {
    week: 3,
    winners: [
      { place: 1, names: 'Alex & Sam' },
      { place: 2, names: 'Jo & Pat' },
      { place: 4, names: 'Lee & Kim' },
    ],
  },
  { week: 2, winners: [] },
];

const renderDisplay = (shouldApplyWinter: boolean) =>
  render(
    <MemoryRouter>
      <PastWinnersDisplay pastWinners={weeks} shouldApplyWinter={shouldApplyWinter} />
    </MemoryRouter>
  );

describe('PastWinnersDisplay', () => {
  it('shows nothing when there are no past weeks', () => {
    const { container } = render(
      <MemoryRouter>
        <PastWinnersDisplay pastWinners={[]} shouldApplyWinter={false} />
      </MemoryRouter>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('lists each week with its winners and a medal or number for the place', () => {
    renderDisplay(false);

    expect(screen.getByText('Past Winners')).toBeInTheDocument();
    expect(screen.getByText('Week 3')).toBeInTheDocument();
    expect(screen.getByText('Alex & Sam')).toBeInTheDocument();
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    // Fourth place has no medal, so it shows its number.
    expect(screen.getByText('#4')).toBeInTheDocument();
  });

  it('says TBD for a week with no winners yet', () => {
    renderDisplay(false);

    expect(screen.getByText('Week 2')).toBeInTheDocument();
    expect(screen.getByText('TBD')).toBeInTheDocument();
  });

  it('uses the winter colours for the week cards when winter is on', () => {
    renderDisplay(true);

    expect(screen.getByText('TBD')).toHaveClass('text-cyan-300/50');
  });
});

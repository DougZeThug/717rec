import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeadToHeadSection } from '@/components/compare/HeadToHeadSection';

const renderSection = (overrides: Partial<React.ComponentProps<typeof HeadToHeadSection>> = {}) =>
  render(
    <HeadToHeadSection
      team1Name="Alpha"
      team2Name="Beta"
      team1Wins={7}
      team2Wins={5}
      gameWins1={18}
      gameWins2={20}
      lastPlayed={null}
      isFirstMeeting={false}
      {...overrides}
    />
  );

describe('HeadToHeadSection leader colour', () => {
  // --primary is a fill colour. As text on a card it read under 4.5:1 in the
  // dark theme; text-primary-text is the text shade of the same blue.
  it('draws the series leader and the game leader in the primary text colour', () => {
    renderSection();

    const seriesLeader = screen.getByText('7 wins');
    expect(seriesLeader).toHaveClass('font-semibold', 'text-primary-text');
    expect(seriesLeader).not.toHaveClass('text-primary');
    expect(screen.getByText('5 wins')).not.toHaveClass('text-primary-text');

    const gameLeader = screen.getByText('20');
    expect(gameLeader).toHaveClass('text-primary-text');
    expect(gameLeader).not.toHaveClass('text-primary');
    expect(screen.getByText('18')).not.toHaveClass('text-primary-text');
  });

  it('marks the other side when the second team leads', () => {
    renderSection({ team1Wins: 2, team2Wins: 9, gameWins1: 30, gameWins2: 12 });

    expect(screen.getByText('9 wins')).toHaveClass('text-primary-text');
    expect(screen.getByText('2 wins')).not.toHaveClass('text-primary-text');
    expect(screen.getByText('30')).toHaveClass('text-primary-text');
    expect(screen.getByText('12')).not.toHaveClass('text-primary-text');
  });
});

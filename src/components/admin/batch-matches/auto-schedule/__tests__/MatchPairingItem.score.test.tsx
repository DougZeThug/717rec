import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import type { TeamPairing } from '@/types/autoSchedule';

import { MatchPairingItem } from '../MatchPairingItem';

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('@/components/ui/team/TeamLogo', () => ({ TeamLogo: () => null }));

const makeTeam = (id: string, name: string): Team =>
  ({ id, name, wins: 1, losses: 0 }) as unknown as Team;

const pairingScoring = (compatibilityScore: number, hasPlayedBefore = false): TeamPairing => ({
  team1: makeTeam('t1', 'Alpha'),
  team2: makeTeam('t2', 'Bravo'),
  compatibilityScore,
  hasPlayedBefore,
});

const renderCard = (compatibilityScore: number, hasPlayedBefore = false) =>
  render(
    <MatchPairingItem
      pairing={pairingScoring(compatibilityScore, hasPlayedBefore)}
      index={0}
      blockName="Early"
    />
  );

describe('the score on a pairing card', () => {
  // OFF scores are only 0, 5 and 10. They read as they always did.
  it.each([
    [0, 'Score: 0.0/10'],
    [5, 'Score: 5.0/10'],
    [10, 'Score: 10.0/10'],
    [8, 'Score: 8.0/10'],
  ])('reads %d as "%s", as it did before the switch worked', (score, text) => {
    renderCard(score);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  // ON scores: a neighbouring pair is 4.5 to 5, a same-division pair is 9.5 to 10.
  it.each([
    [4.6, 'Score: 4.6/10'],
    [4.5, 'Score: 4.5/10'],
    [4.98828125, 'Score: 4.98/10'],
    [4.99609375, 'Score: 4.99/10'],
    [9.99609375, 'Score: 10.0/10'],
    [9.5, 'Score: 9.5/10'],
  ])('reads %d as "%s"', (score, text) => {
    renderCard(score);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('never reads a score under 5 as 5.0', () => {
    renderCard(4.99609375);

    expect(screen.queryByText('Score: 5.0/10')).not.toBeInTheDocument();
    expect(screen.getByText('Score: 4.99/10')).toBeInTheDocument();
  });
});

describe('the amber note on a pairing card', () => {
  it.each([
    ['4.99609375, a neighbouring pair that is almost level', 4.99609375],
    ['4.5, the lowest a neighbouring pair can get', 4.5],
    ['0, a forbidden pair', 0],
  ])('stays for a score of %s: amber card, info icon and the tooltip', async (_name, score) => {
    const { container } = renderCard(score);

    expect(container.firstChild).toHaveClass('bg-amber-50');
    expect(container.querySelector('svg.text-amber-500')).not.toBeNull();
    expect(container.querySelector('svg.text-green-500')).toBeNull();

    const trigger = container.querySelector('[data-state]');
    expect(trigger).not.toBeNull();
    fireEvent.focus(trigger as HTMLElement);

    expect(
      (await screen.findAllByText('These teams may not be evenly matched')).length
    ).toBeGreaterThan(0);
  });

  it.each([
    ['5, the neighbouring-division score with the switch OFF', 5],
    ['10, a same-division pair', 10],
    ['9.99609375, a same-division pair with the switch ON', 9.99609375],
  ])('is not there for a score of %s: green card and check icon', (_name, score) => {
    const { container } = renderCard(score);

    expect(container.firstChild).toHaveClass('bg-green-50');
    expect(container.querySelector('svg.text-green-500')).not.toBeNull();
    expect(container.querySelector('svg.text-amber-500')).toBeNull();
  });

  it('shows the rematch note, not the evenly-matched note, for a rematch that also scores under 5', async () => {
    const { container } = renderCard(4.99609375, true);

    expect(container.firstChild).toHaveClass('bg-amber-50');
    const trigger = container.querySelector('[data-state]');
    fireEvent.focus(trigger as HTMLElement);

    expect(
      (await screen.findAllByText('These teams have played against each other before')).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('These teams may not be evenly matched')).not.toBeInTheDocument();
  });
});

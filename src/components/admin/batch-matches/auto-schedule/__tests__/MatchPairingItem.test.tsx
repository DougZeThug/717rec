import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import type { TeamPairing } from '@/types/autoSchedule';

import { MatchPairingItem } from '../MatchPairingItem';

const mockTheme = vi.hoisted(() => ({ isWinterTheme: false }));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => mockTheme,
}));

vi.mock('@/components/ui/team/TeamLogo', () => ({ TeamLogo: () => null }));

const makeTeam = (id: string, name: string): Team =>
  ({ id, name, wins: 1, losses: 0 }) as unknown as Team;

const pairing: TeamPairing = {
  team1: makeTeam('t1', 'Alpha'),
  team2: makeTeam('t2', 'Bravo'),
  compatibilityScore: 8,
  hasPlayedBefore: false,
};

describe('MatchPairingItem', () => {
  beforeEach(() => {
    mockTheme.isWinterTheme = false;
  });

  it('shows the score badge', () => {
    render(<MatchPairingItem pairing={pairing} index={0} blockName="Early" />);

    expect(screen.getByText('Score: 8.0/10')).toBeInTheDocument();
  });

  // TooltipTrigger asChild passes its handlers to the badge. If the badge drops
  // them, the tooltip can never open.
  it('opens the explanation tooltip when the score badge gets focus', async () => {
    render(<MatchPairingItem pairing={pairing} index={0} blockName="Early" />);

    const trigger = screen.getByText('Score: 8.0/10').closest('[data-state]');
    expect(trigger).not.toBeNull();

    fireEvent.focus(trigger as HTMLElement);

    expect((await screen.findAllByText('Good match pairing')).length).toBeGreaterThan(0);
  });

  it('uses the dark winter card colors for a good pairing', () => {
    mockTheme.isWinterTheme = true;
    const { container } = render(
      <MatchPairingItem pairing={pairing} index={0} blockName="Early" />
    );

    expect(screen.getByText('Score: 8.0/10')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-[hsl(222,30%,15%)]');
  });

  it('keeps the amber warning card in the winter theme for a rematch', () => {
    mockTheme.isWinterTheme = true;
    const { container } = render(
      <MatchPairingItem
        pairing={{ ...pairing, hasPlayedBefore: true }}
        index={0}
        blockName="Early"
      />
    );

    expect(container.firstChild).toHaveClass('bg-amber-900/30');
  });
});

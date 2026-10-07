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

const pairing: TeamPairing = {
  team1: makeTeam('t1', 'Alpha'),
  team2: makeTeam('t2', 'Bravo'),
  compatibilityScore: 8,
  hasPlayedBefore: false,
};

describe('MatchPairingItem', () => {
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
});

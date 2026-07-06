import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/team/TeamLogo', () => ({
  TeamLogo: ({ teamName }: { teamName: string }) => (
    <div data-testid="team-logo" data-team={teamName} />
  ),
}));

import type { HeadToHeadRecord } from '@/types/headToHead';

import H2HMobileCard from '../H2HMobileCard';

const makeRecord = (overrides: Partial<HeadToHeadRecord> = {}): HeadToHeadRecord => ({
  team_id: 'team-1',
  opponent_id: 'opp-1',
  opponent_name: 'The Rivals',
  matches_played: 4,
  wins: 2,
  losses: 2,
  game_wins: 6,
  game_losses: 5,
  win_pct: 50,
  last_played_at: null,
  ...overrides,
});

describe('H2HMobileCard', () => {
  const onCardClick = vi.fn();

  beforeEach(() => {
    onCardClick.mockReset();
  });

  it('shows the opponent name, W-L record and win percentage', () => {
    render(<H2HMobileCard record={makeRecord()} onCardClick={onCardClick} />);
    expect(screen.getByText('The Rivals')).toBeInTheDocument();
    expect(screen.getByText('2W')).toBeInTheDocument();
    expect(screen.getByText('2L')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('shows the game record', () => {
    render(<H2HMobileCard record={makeRecord()} onCardClick={onCardClick} />);
    expect(screen.getByText(/Games: 6-5/)).toBeInTheDocument();
  });

  it('shows the last-played date when available', () => {
    render(
      <H2HMobileCard
        record={makeRecord({ last_played_at: '2026-03-14T00:00:00Z' })}
        onCardClick={onCardClick}
      />
    );
    expect(screen.getByText(/Last: Mar 14, 2026/)).toBeInTheDocument();
  });

  it('labels an even matchup with 3+ games as a Rival', () => {
    render(
      <H2HMobileCard
        record={makeRecord({ matches_played: 4, wins: 2, losses: 2, win_pct: 50 })}
        onCardClick={onCardClick}
      />
    );
    expect(screen.getByText('Rival')).toBeInTheDocument();
  });

  it('labels a dominant record as Dominated', () => {
    render(
      <H2HMobileCard
        record={makeRecord({ matches_played: 6, wins: 6, losses: 0, win_pct: 100 })}
        onCardClick={onCardClick}
      />
    );
    expect(screen.getByText('Dominated')).toBeInTheDocument();
  });

  it('labels a losing record as Nemesis', () => {
    render(
      <H2HMobileCard
        record={makeRecord({ matches_played: 6, wins: 0, losses: 6, win_pct: 0 })}
        onCardClick={onCardClick}
      />
    );
    expect(screen.getByText('Nemesis')).toBeInTheDocument();
  });

  it('shows no rivalry badge with fewer than 3 matches', () => {
    render(
      <H2HMobileCard
        record={makeRecord({ matches_played: 2, wins: 1, losses: 1 })}
        onCardClick={onCardClick}
      />
    );
    expect(screen.queryByText('Rival')).not.toBeInTheDocument();
    expect(screen.queryByText('Nemesis')).not.toBeInTheDocument();
  });

  it('calls onCardClick with the opponent id and name', async () => {
    render(<H2HMobileCard record={makeRecord()} onCardClick={onCardClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onCardClick).toHaveBeenCalledWith('opp-1', 'The Rivals');
  });

  it('does not call onCardClick when the opponent id is missing', async () => {
    render(
      <H2HMobileCard
        record={makeRecord({ opponent_id: '' as unknown as string })}
        onCardClick={onCardClick}
      />
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onCardClick).not.toHaveBeenCalled();
  });
});

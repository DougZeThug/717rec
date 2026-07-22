import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Tables } from '@/integrations/supabase/types';

import { ChangeGameWinnerDialog } from '../ChangeGameWinnerDialog';
import { DeleteRoundDialog } from '../DeleteRoundDialog';
import { EditRoundDialog } from '../EditRoundDialog';

const baseRound = {
  id: 'round-1',
  game_id: 'game-1',
  round_number: 3,
  team1_score: 2,
  team2_score: 1,
  team1_bags_in: 0,
  team1_bags_on: 2,
  team1_bags_off: 2,
  team2_bags_in: 0,
  team2_bags_on: 1,
  team2_bags_off: 3,
  team1_thrower_id: 'p1',
  team2_thrower_id: 'p3',
} as Tables<'match_rounds'>;

const team1Players = [{ player_id: 'p1' }, { player_id: 'p2' }] as Tables<'game_players'>[];
const team2Players = [{ player_id: 'p3' }, { player_id: 'p4' }] as Tables<'game_players'>[];
const makeRosterPlayer = (id: string, displayName: string): Tables<'team_players'> => ({
  id,
  display_name: displayName,
  team_id: id.startsWith('p1') || id.startsWith('p2') ? 'team-a' : 'team-b',
  profile_id: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
});

const rosterById = new Map<string, Tables<'team_players'>>([
  ['p1', makeRosterPlayer('p1', 'Alice')],
  ['p2', makeRosterPlayer('p2', 'Ava')],
  ['p3', makeRosterPlayer('p3', 'Bert')],
  ['p4', makeRosterPlayer('p4', 'Bea')],
]);

describe('live correction dialogs', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('confirms round deletion only from the destructive action', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DeleteRoundDialog
        open
        onOpenChange={onOpenChange}
        roundNumber={3}
        gameNumber={2}
        onConfirm={onConfirm}
        isDeleting={false}
      />
    );

    expect(screen.getByText('Delete round 3?')).toBeInTheDocument();
    expect(screen.getByText(/removes round 3 from game 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep round' }));
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete round' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('submits edited scores, bags, and throwers as an update patch', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EditRoundDialog
        open
        onOpenChange={vi.fn()}
        round={baseRound}
        team1Name="Team A"
        team2Name="Team B"
        team1Players={team1Players}
        team2Players={team2Players}
        rosterById={rosterById}
        onSubmit={onSubmit}
        isSubmitting={false}
      />
    );

    fireEvent.change(screen.getByLabelText('Score', { selector: '#team1-score' }), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText('In', { selector: '#team1-in' }), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText('On', { selector: '#team1-on' }), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText('Off', { selector: '#team1-off' }), {
      target: { value: '1' },
    });

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        team1Score: 3,
        team2Score: 1,
        team1ThrowerId: 'p1',
        team2ThrowerId: 'p3',
        team1Bags: { bagsIn: 0, bagsOn: 3, bagsOff: 1 },
        team2Bags: { bagsIn: 0, bagsOn: 1, bagsOff: 3 },
      });
    });
  });

  it('resets an open edit form when realtime delivers a different round', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <EditRoundDialog
        open
        onOpenChange={vi.fn()}
        round={baseRound}
        team1Name="Team A"
        team2Name="Team B"
        team1Players={team1Players}
        team2Players={team2Players}
        rosterById={rosterById}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />
    );

    const team1Score = screen.getByLabelText('Score', { selector: '#team1-score' });
    await user.clear(team1Score);
    await user.type(team1Score, '9');
    expect(team1Score).toHaveValue(9);

    rerender(
      <EditRoundDialog
        open
        onOpenChange={vi.fn()}
        round={{ ...baseRound, id: 'round-2', round_number: 4, team1_score: 5 }}
        team1Name="Team A"
        team2Name="Team B"
        team1Players={team1Players}
        team2Players={team2Players}
        rosterById={rosterById}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByRole('heading', { name: 'Edit round 4' })).toBeInTheDocument();
    await waitFor(() => expect(team1Score).toHaveValue(5));
  });

  it('requires valid bag math before saving a round', () => {
    const onSubmit = vi.fn();

    render(
      <EditRoundDialog
        open
        onOpenChange={vi.fn()}
        round={{
          ...baseRound,
          team1_score: 5,
          team1_bags_in: 0,
          team1_bags_on: 1,
          team1_bags_off: 3,
        }}
        team1Name="Team A"
        team2Name="Team B"
        team1Players={team1Players}
        team2Players={team2Players}
        rosterById={rosterById}
        onSubmit={onSubmit}
        isSubmitting={false}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent("Team A bag breakdown doesn't add up");
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the selected game winner', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <ChangeGameWinnerDialog
        open
        onOpenChange={vi.fn()}
        gameNumber={1}
        team1={{ id: 'team-a', name: 'Team A' }}
        team2={{ id: 'team-b', name: 'Team B' }}
        currentWinnerId="team-a"
        totals={{ team1: 18, team2: 21 }}
        onConfirm={onConfirm}
        isSubmitting={false}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Team B' }));
    await user.click(screen.getByRole('button', { name: 'Set winner' }));

    expect(onConfirm).toHaveBeenCalledWith('team-b');
  });
});

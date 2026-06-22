import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { PlayoffMatch, Team } from '@/types';

import MatchScoreEditor from '../MatchScoreEditor';

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
});

const teams: Team[] = [
  { id: 't1', name: 'Team One' } as unknown as Team,
  { id: 't2', name: 'Team Two' } as unknown as Team,
];

const match: PlayoffMatch = {
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  bestOf: 3,
  games: [{ team1Score: 0, team2Score: 0 }],
  matchType: 'winners',
  round: 1,
} as unknown as PlayoffMatch;

describe('MatchScoreEditor — 0-0 save guard (regression)', () => {
  it('does not call onSave and surfaces an error when all games are 0-0', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(<MatchScoreEditor match={match} teams={teams} onSave={onSave} onCancel={onCancel} />);

    const saveButton = screen.getByRole('button', { name: /save scores/i });
    fireEvent.click(saveButton);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/cannot save a match with no winner/i)).toBeInTheDocument();
  });
});

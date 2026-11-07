import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { PlayoffMatch, Team } from '@/types';

import MatchScoreEditor from '../MatchScoreEditor';

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
});

const teams: Team[] = [{ id: 't1', name: 'Team One' } as unknown as Team];

// Only one team: the other spot is a BYE, so the editor offers a walkover win.
const byeMatch: PlayoffMatch = {
  id: 'm1',
  team1Id: 't1',
  team2Id: null,
  bestOf: 3,
  games: [],
  matchType: 'winners',
  round: 1,
} as unknown as PlayoffMatch;

describe('MatchScoreEditor walkover (BYE) actions', () => {
  it('names the winner and offers Cancel and Award Win', () => {
    render(<MatchScoreEditor match={byeMatch} teams={teams} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(/Team One wins by walkover/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Award Win \(3-0\)/ })).toBeInTheDocument();
  });

  // jsdom does no layout, so this pins the classes. These two plain buttons were about 36px tall;
  // the app's buttons are at least 44px.
  it('keeps both buttons at least 44px tall', () => {
    render(<MatchScoreEditor match={byeMatch} teams={teams} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: /Award Win/ })).toHaveClass('min-h-11');
  });
});

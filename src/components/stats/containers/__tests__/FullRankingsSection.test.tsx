import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../FullRankings', () => ({
  default: ({
    rankings,
    myTeamId,
  }: {
    rankings: Array<{ teamId: string }>;
    myTeamId?: string | null;
  }) => (
    <div data-testid="full-rankings" data-count={rankings.length} data-my-team={myTeamId ?? ''} />
  ),
}));

import { Ranking } from '@/types';

import FullRankingsSection from '../FullRankingsSection';

const rankings = [{ teamId: 'a' }, { teamId: 'b' }, { teamId: 'c' }] as Ranking[];

describe('FullRankingsSection', () => {
  it('forwards rankings to FullRankings', () => {
    render(<FullRankingsSection rankings={rankings} />);
    expect(screen.getByTestId('full-rankings')).toHaveAttribute('data-count', '3');
  });

  it('forwards myTeamId to FullRankings', () => {
    render(<FullRankingsSection rankings={rankings} myTeamId="team-b" />);
    expect(screen.getByTestId('full-rankings')).toHaveAttribute('data-my-team', 'team-b');
  });

  it('handles a null myTeamId', () => {
    render(<FullRankingsSection rankings={rankings} myTeamId={null} />);
    expect(screen.getByTestId('full-rankings')).toHaveAttribute('data-my-team', '');
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';

import type { MatchWithOpponent, TeamInfo } from '../myMatchesTypes';

const mockUseSeasonalTheme = vi.hoisted(() => vi.fn(() => ({ shouldApplyWinter: false })));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => mockUseSeasonalTheme(),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

// Stub the row so its own data hooks are never pulled into this render.
vi.mock('../MyMatchRow', () => ({
  MatchRow: ({ matchInfo }: { matchInfo: MatchWithOpponent }) => (
    <div data-testid="match-row">{matchInfo.opponent.name}</div>
  ),
}));

import MyMatchesSection from '../MyMatchesSection';

const myTeam: TeamInfo = { id: 'team-1', name: 'Three Amigos', logoUrl: null };

const matchInfo: MatchWithOpponent = {
  match: { id: 'match-9', team1Id: 'team-1', team2Id: 'team-2' } as Match,
  opponent: { id: 'team-2', name: 'Baggin Rights', logoUrl: null },
  weekNumber: 4,
};

const renderSection = () =>
  render(
    <MemoryRouter>
      <MyMatchesSection matches={[matchInfo]} myTeam={myTeam} isPreviousMatches={false} />
    </MemoryRouter>
  );

describe('MyMatchesSection', () => {
  // --primary is a fill colour: as text it read under 4.5:1 in the dark theme.
  it('writes the section title in the primary text colour', () => {
    renderSection();

    const title = screen.getByText('Your Next Match');
    expect(title).toHaveClass('text-primary-text');
    expect(title).not.toHaveClass('text-primary');
  });

  // jsdom does no layout, so this pins the classes. The link was 16px tall and
  // drawn in 70% primary, which was too faint to read as text.
  it('makes "See full schedule" at least 24px tall and readable', () => {
    renderSection();

    const link = screen.getByRole('link', { name: 'See full schedule' });
    expect(link).toHaveAttribute('href', '/schedule');
    expect(link).toHaveClass(
      'min-h-6',
      'inline-flex',
      'items-center',
      'text-primary-text',
      'hover:underline'
    );
    expect(link).not.toHaveClass('text-primary/70');
  });

  it('keeps the winter colours for the link', () => {
    mockUseSeasonalTheme.mockReturnValue({ shouldApplyWinter: true });
    renderSection();

    const link = screen.getByRole('link', { name: 'See full schedule' });
    expect(link).toHaveClass('min-h-6', 'text-cyan-400/70', 'hover:text-cyan-300');
    expect(link).not.toHaveClass('text-primary-text');
  });
});

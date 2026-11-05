import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';

// react-window draws no rows in jsdom, so this stand-in renders every row itself
// and records the sizes it was given.
vi.mock('@/components/ui/VirtualizedList', () => ({
  VirtualizedList: ({
    items,
    rowHeight,
    height,
    overscanCount,
    renderRow,
  }: {
    items: unknown[];
    rowHeight: number;
    height: number;
    overscanCount: number;
    renderRow: (item: unknown, index: number, style: React.CSSProperties) => React.ReactElement;
  }) => (
    <div
      data-testid="virtualized"
      data-row-height={rowHeight}
      data-height={height}
      data-overscan={overscanCount}
    >
      {items.map((item, index) => renderRow(item, index, {}))}
    </div>
  ),
}));

import MatchList from '../MatchList';

// The home team wins every match 2-1.
const makeMatch = (index: number): Match =>
  ({
    id: `match-${index}`,
    team1Id: 'team-a',
    team2Id: 'team-b',
    team1Details: { name: `Home ${index}`, image_url: null, logo_url: null },
    team2Details: { name: `Away ${index}`, image_url: null, logo_url: null },
    team1_game_wins: 2,
    team2_game_wins: 1,
    date: '2026-06-10T18:00:00',
  }) as unknown as Match;

const makeMatches = (count: number): Match[] =>
  Array.from({ length: count }, (_, index) => makeMatch(index));

const renderList = (props: Partial<React.ComponentProps<typeof MatchList>> = {}) =>
  render(
    <MemoryRouter>
      <MatchList matches={[]} teamId="team-a" title="Match History" isPast {...props} />
    </MemoryRouter>
  );

describe('MatchList empty state', () => {
  it('says there is no history when there are no matches and nothing failed', () => {
    renderList();

    expect(screen.getByText('No Match History')).toBeInTheDocument();
    expect(
      screen.getByText('Match history will appear after games are played')
    ).toBeInTheDocument();
  });

  it('says there are no upcoming matches for an upcoming list', () => {
    renderList({ isPast: false });

    expect(screen.getByText('No Upcoming Matches')).toBeInTheDocument();
    expect(screen.getByText('No upcoming matches scheduled')).toBeInTheDocument();
    expect(screen.queryByText('No Match History')).not.toBeInTheDocument();
  });

  it('treats a list as past history when isPast is not given', () => {
    renderList({ isPast: undefined });

    expect(screen.getByText('No Match History')).toBeInTheDocument();
    expect(screen.queryByText('No Upcoming Matches')).not.toBeInTheDocument();
  });

  it('does not say there is no history when the matches failed to load', () => {
    renderList({ hasError: true });

    expect(screen.queryByText('No Match History')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Match history will appear after games are played')
    ).not.toBeInTheDocument();
    // The section heading stays.
    expect(screen.getByText('Match History')).toBeInTheDocument();
  });

  it('does not say there are no upcoming matches when the matches failed to load', () => {
    renderList({ hasError: true, isPast: false });

    expect(screen.queryByText('No Upcoming Matches')).not.toBeInTheDocument();
    expect(screen.queryByText('No upcoming matches scheduled')).not.toBeInTheDocument();
  });
});

describe('MatchList loading', () => {
  it('shows a placeholder, and not the empty state, while the matches load', () => {
    const { container } = renderList({ isLoading: true });

    expect(container.querySelector('.h-32.w-full')).toBeInTheDocument();
    expect(screen.queryByText('No Match History')).not.toBeInTheDocument();
  });

  it('shows the placeholder instead of the rows while loading', () => {
    const { container } = renderList({ isLoading: true, matches: makeMatches(3) });

    expect(container.querySelector('.h-32.w-full')).toBeInTheDocument();
    expect(screen.queryByText('Home 0')).not.toBeInTheDocument();
  });

  it('shows no placeholder once the matches are loaded', () => {
    const { container } = renderList({ matches: makeMatches(1) });

    expect(container.querySelector('.h-32.w-full')).not.toBeInTheDocument();
    expect(screen.getByText('Home 0')).toBeInTheDocument();
  });
});

describe('MatchList rows', () => {
  it('shows one row per match in a plain list when there are few matches', () => {
    renderList({ matches: makeMatches(3) });

    for (const index of [0, 1, 2]) {
      expect(screen.getByText(`Home ${index}`)).toBeInTheDocument();
      expect(screen.getByText(`Away ${index}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('virtualized')).not.toBeInTheDocument();
  });

  it('keeps the plain list at exactly 20 matches', () => {
    renderList({ matches: makeMatches(20) });

    expect(screen.queryByTestId('virtualized')).not.toBeInTheDocument();
    expect(screen.getByText('Home 19')).toBeInTheDocument();
  });

  it('switches to the virtualized list above 20 matches', () => {
    renderList({ matches: makeMatches(21) });

    const list = screen.getByTestId('virtualized');
    expect(list).toHaveAttribute('data-row-height', '72');
    // 21 rows of 72px would be taller than the 400px cap.
    expect(list).toHaveAttribute('data-height', '400');
    expect(list).toHaveAttribute('data-overscan', '3');
    expect(screen.getByText('Home 0')).toBeInTheDocument();
    expect(screen.getByText('Away 20')).toBeInTheDocument();
  });

  it('draws a line under every virtualized row except the last', () => {
    renderList({ matches: makeMatches(21) });

    const rows = [...screen.getByTestId('virtualized').children];
    expect(rows).toHaveLength(21);
    for (const row of rows.slice(0, -1)) {
      expect(row).toHaveClass('border-b', 'border-border');
    }
    expect(rows[20]).not.toHaveClass('border-b');
  });

  it('colours the winner green and the loser red when asked to', () => {
    renderList({ matches: makeMatches(2), highlightWinnerLoser: true });

    expect(screen.getByText('Home 1')).toHaveClass('text-green-700');
    expect(screen.getByText('Away 1')).toHaveClass('text-red-700');
  });

  it('adds no winner or loser colour by default', () => {
    renderList({ matches: makeMatches(2) });

    expect(screen.getByText('Home 1')).not.toHaveClass('text-green-700');
    expect(screen.getByText('Away 1')).not.toHaveClass('text-red-700');
  });

  it('colours the winner and the loser in the virtualized list too', () => {
    renderList({ matches: makeMatches(21), highlightWinnerLoser: true });

    expect(screen.getByText('Home 20')).toHaveClass('text-green-700');
    expect(screen.getByText('Away 20')).toHaveClass('text-red-700');
  });

  it('adds no winner or loser colour in the virtualized list by default', () => {
    renderList({ matches: makeMatches(21) });

    expect(screen.getByText('Home 20')).not.toHaveClass('text-green-700');
    expect(screen.getByText('Away 20')).not.toHaveClass('text-red-700');
  });
});

describe('MatchList heading', () => {
  it('uses the default title when none is given', () => {
    renderList({ title: undefined });

    expect(
      screen.getByRole('heading', { level: 2, name: 'Current Season Match History' })
    ).toBeInTheDocument();
  });

  it('shows a plain heading with the given id when the list is not collapsible', () => {
    renderList({ matches: makeMatches(1), headingId: 'history-heading' });

    const heading = screen.getByRole('heading', { level: 2, name: 'Match History' });
    expect(heading).toHaveAttribute('id', 'history-heading');
    // A plain heading is not a button, and the rows are always there.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Home 0')).toBeInTheDocument();
  });

  it('shows no heading at all when the title is empty', () => {
    renderList({ matches: makeMatches(1), title: '' });

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Home 0')).toBeInTheDocument();
  });

  it('does not collapse an untitled list even when collapsible is set', () => {
    renderList({ matches: makeMatches(1), title: '', collapsible: true });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Home 0')).toBeInTheDocument();
  });
});

describe('MatchList collapsible', () => {
  it('puts the heading in a button that opens and closes the rows', async () => {
    const user = userEvent.setup();
    renderList({ matches: makeMatches(1), collapsible: true, headingId: 'history-heading' });

    const toggle = screen.getByRole('button', { name: 'Match History' });
    expect(screen.getByRole('heading', { level: 2, name: 'Match History' })).toHaveAttribute(
      'id',
      'history-heading'
    );
    // Open by default.
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Home 0')).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Home 0')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByText('Home 0')).toBeInTheDocument();
  });

  it('starts closed when defaultOpen is false, and opens on a click', async () => {
    const user = userEvent.setup();
    renderList({ matches: makeMatches(1), collapsible: true, defaultOpen: false });

    const toggle = screen.getByRole('button', { name: 'Match History' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Home 0')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByText('Home 0')).toBeInTheDocument();
  });

  it('uses the default title in the button when none is given', () => {
    renderList({ collapsible: true, title: undefined });

    expect(
      screen.getByRole('button', { name: 'Current Season Match History' })
    ).toBeInTheDocument();
  });
});

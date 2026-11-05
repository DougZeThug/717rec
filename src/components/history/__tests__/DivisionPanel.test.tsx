import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DivisionPanel from '../DivisionPanel';

const state = vi.hoisted(() => ({ isMobile: false, isWinterTheme: false }));
// Counts every time the (mocked) standings table is drawn, so a test can tell
// "never drawn" apart from "drawn, then removed again".
const tableSpy = vi.hoisted(() => vi.fn());
// Records the `initial` prop each time the (mocked) AnimatePresence is drawn.
const presenceSpy = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => state.isMobile }));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: state.isWinterTheme }),
}));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children, initial }: { children: React.ReactNode; initial?: boolean }) => {
    presenceSpy(initial);
    return children;
  },
  m: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));
vi.mock('../HistoricalStandingsTable', () => ({
  default: ({ teams }: { teams: { team_name: string }[] }) => {
    tableSpy(teams);
    return (
      <ol data-testid="table">
        {teams.map((t) => (
          <li key={t.team_name}>{t.team_name}</li>
        ))}
      </ol>
    );
  },
}));

const makeTeam = (name: string, wins: number, playoffRank: number | null) => ({
  team_id: name,
  season_id: 's1',
  match_wins: wins,
  match_losses: 0,
  game_wins: 0,
  game_losses: 0,
  sos: null,
  power_score: null,
  champion: false,
  runner_up: false,
  division_name: 'Gold',
  team_name: name,
  team_logo_url: null,
  team_image_url: null,
  playoff_rank: playoffRank,
});

describe('DivisionPanel', () => {
  beforeEach(() => {
    state.isMobile = false;
    state.isWinterTheme = false;
    // A click remembers the division as open or closed (session storage); start every test clean.
    sessionStorage.clear();
  });

  it('shows the division name with its team count and ranks teams by playoff finish, then wins', () => {
    render(
      <DivisionPanel
        seasonId="s1"
        divisionName="Gold"
        teams={[
          makeTeam('No Playoff Few Wins', 1, null),
          makeTeam('Second', 5, 2),
          makeTeam('No Playoff Many Wins', 9, null),
          makeTeam('First', 3, 1),
        ]}
      />
    );

    expect(screen.getByRole('heading', { level: 4, name: /Gold/ })).toHaveTextContent('Gold(4)');
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'First',
      'Second',
      'No Playoff Many Wins',
      'No Playoff Few Wins',
    ]);
  });

  it('collapses and expands the table when the header is clicked', () => {
    render(<DivisionPanel seasonId="s1" divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    expect(screen.getByTestId('table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('heading', { level: 4 }));
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('heading', { level: 4 }));
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('starts collapsed on a phone and uses the winter text colours in the winter theme', () => {
    state.isMobile = true;
    state.isWinterTheme = true;
    render(<DivisionPanel seasonId="s1" divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4 })).toHaveClass('text-white');
  });

  it('never draws the team list on a phone, not even for one frame', () => {
    state.isMobile = true;
    render(<DivisionPanel seasonId="s1" divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    // The old code started open and closed itself in an effect, so the table
    // was drawn once (a giant list that then collapsed). It must never be drawn.
    expect(tableSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('draws the team list once on a wide screen', () => {
    render(<DivisionPanel seasonId="s1" divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    expect(tableSpy).toHaveBeenCalled();
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('closes an open division when the screen shrinks to a phone', () => {
    const { rerender } = render(
      <DivisionPanel seasonId="s1" divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />
    );
    expect(screen.getByTestId('table')).toBeInTheDocument();

    state.isMobile = true;
    rerender(<DivisionPanel seasonId="s1" divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('gives the chevron button a fixed name and an aria-expanded that follows open and closed', () => {
    render(<DivisionPanel seasonId="s1" divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    const toggle = screen.getByRole('button', { name: 'Toggle Gold teams' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // A click on the button reaches the row, so the row's handler flips the state.
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAccessibleName('Toggle Gold teams');
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('heading', { level: 4 }));
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Toggle Gold teams');
  });

  it('reports the chevron button as closed on a phone', () => {
    state.isMobile = true;
    render(<DivisionPanel seasonId="s1" divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    expect(screen.getByRole('button', { name: 'Toggle Gold teams' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});

// The page keeps what is open in session storage, so Back from a team page lands on the same view.
describe('DivisionPanel remembers what is open', () => {
  const STORAGE_KEY = 'history_open_state';
  const gold = (seasonId = 's1') => (
    <DivisionPanel seasonId={seasonId} divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />
  );
  const saved = () => JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');

  beforeEach(() => {
    state.isMobile = false;
    state.isWinterTheme = false;
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens a division the visitor left open on a phone, and keeps it open when the screen redraws', () => {
    state.isMobile = true;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ 'division:s1:Gold': true }));

    const { rerender } = render(gold());
    expect(screen.getByTestId('table')).toBeInTheDocument();

    // Still a phone: the old code closed it again here, which lost the place.
    rerender(gold());
    expect(screen.getByTestId('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle Gold teams' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('does not play the opening animation for a division that is already open when the page is drawn', () => {
    // A division left open must appear at full height. If it grew from nothing, the scroll
    // position restored on Back would land short, because the page is still short at that time.
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ 'division:s1:Gold': true }));

    render(gold());

    expect(presenceSpy).toHaveBeenCalledWith(false);
  });

  it('starts closed on a phone when nothing is remembered', () => {
    state.isMobile = true;

    render(gold());

    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    expect(tableSpy).not.toHaveBeenCalled();
  });

  it('remembers a division opened by hand on a phone, across a new visit to the page', () => {
    state.isMobile = true;
    const first = render(gold());
    fireEvent.click(screen.getByRole('heading', { level: 4 }));
    expect(screen.getByTestId('table')).toBeInTheDocument();
    first.unmount();

    render(gold());

    expect(screen.getByTestId('table')).toBeInTheDocument();
    expect(saved()).toEqual({ 'division:s1:Gold': true });
  });

  it('remembers a division closed by hand on a wide screen, where it opens by default', () => {
    const first = render(gold());
    fireEvent.click(screen.getByRole('heading', { level: 4 }));
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    first.unmount();

    render(gold());

    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    expect(saved()).toEqual({ 'division:s1:Gold': false });
  });

  it('keeps a division the visitor opened on a phone open while the page redraws', () => {
    state.isMobile = true;
    const { rerender } = render(gold());
    fireEvent.click(screen.getByRole('heading', { level: 4 }));

    rerender(gold());

    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('closes an open division when the screen shrinks to a phone, and remembers it as closed', () => {
    const { rerender, unmount } = render(gold());
    expect(screen.getByTestId('table')).toBeInTheDocument();

    state.isMobile = true;
    rerender(gold());
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    expect(saved()).toEqual({ 'division:s1:Gold': false });

    // A new visit on the phone starts closed too, not open from an older memory.
    unmount();
    render(gold());
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('keeps one memory per season, so the same division name in another season is separate', () => {
    const first = render(gold('s1'));
    fireEvent.click(screen.getByRole('heading', { level: 4 }));
    first.unmount();

    render(gold('s2'));

    // s1 was closed by hand; s2 was never touched and follows the default (open on a wide screen).
    expect(screen.getByTestId('table')).toBeInTheDocument();
    expect(saved()).toEqual({ 'division:s1:Gold': false });
  });

  it.each([
    ['holds text that is not JSON', () => sessionStorage.setItem(STORAGE_KEY, '{oops')],
    ['holds a value of the wrong kind', () => sessionStorage.setItem(STORAGE_KEY, '["Gold"]')],
    [
      'refuses every read and write',
      () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
          throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new Error('blocked');
        });
      },
    ],
  ])('falls back to the normal behaviour when storage %s', (_label, breakStorage) => {
    breakStorage();

    render(gold());
    expect(screen.getByTestId('table')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('heading', { level: 4 }));
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });
});

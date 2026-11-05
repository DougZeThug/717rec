import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SeasonAccordion from '../SeasonAccordion';
import { SeasonData, useSeasonAccordionViewModel } from '../useSeasonAccordionViewModel';

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));
vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: true }),
}));

const { fetchSeasonStatsForAccordion } = vi.hoisted(() => ({
  fetchSeasonStatsForAccordion: vi.fn(),
}));
vi.mock('@/services/SeasonService', () => ({ SeasonService: { fetchSeasonStatsForAccordion } }));
vi.mock('../SeasonMetaBar', () => ({ default: () => <div>meta bar</div> }));
vi.mock('../DivisionPanel', () => ({
  default: ({ divisionName }: { divisionName: string }) => <div>{divisionName}</div>,
}));
vi.mock('../editing/EditModeContainer', () => ({ default: () => <div>edit mode</div> }));

const season = {
  id: 's1',
  name: 'Spring',
  start_date: '2025-01-01',
  end_date: '2025-03-01',
  is_active: false,
};
const makeRow = (divisionName: string | null): SeasonData => ({
  team_id: 'row-1',
  division_name: divisionName,
  champion: false,
  team_name: 'Row Team',
  match_wins: 1,
  match_losses: 1,
  game_wins: 2,
  game_losses: 2,
  power_score: 0.2,
  season_id: 's1',
  sos: null,
  runner_up: false,
  playoff_rank: null,
  team_logo_url: null,
  team_image_url: null,
});
const EMPTY_SEASON_MESSAGE = 'No standings recorded for this season';
const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>
  );

describe('useSeasonAccordionViewModel', () => {
  it('excludes hidden divisions from groups and team counts, computes highlights', () => {
    const data: SeasonData[] = [
      {
        team_id: '1',
        division_name: 'Hidden Alpha',
        champion: true,
        team_name: 'A',
        match_wins: 5,
        match_losses: 1,
        game_wins: 11,
        game_losses: 3,
        power_score: 0.5,
        season_id: 's1',
        sos: null,
        runner_up: false,
        playoff_rank: null,
        team_logo_url: null,
        team_image_url: null,
      },
      {
        team_id: '2',
        division_name: 'Competitive',
        champion: false,
        team_name: 'B',
        match_wins: 9,
        match_losses: 1,
        game_wins: 7,
        game_losses: 3,
        power_score: 0.9,
        season_id: 's1',
        sos: null,
        runner_up: false,
        playoff_rank: null,
        team_logo_url: null,
        team_image_url: null,
      },
      {
        team_id: '3',
        division_name: 'Casual',
        champion: false,
        team_name: 'C',
        match_wins: 3,
        match_losses: 5,
        game_wins: 15,
        game_losses: 8,
        power_score: 0.2,
        season_id: 's1',
        sos: null,
        runner_up: false,
        playoff_rank: null,
        team_logo_url: null,
        team_image_url: null,
      },
    ];

    const { result } = renderHook(() => useSeasonAccordionViewModel(season, data));
    expect(result.current.teamCount).toBe(2);
    expect(Object.keys(result.current.divisionData)).toEqual(['Competitive', 'Casual']);
    const { highlights } = result.current;
    if (!highlights) throw new Error('Expected highlights to be defined');
    expect(highlights.mostWins.team_name).toBe('B');
    expect(highlights.highestPS.team_name).toBe('B');
    expect(highlights.mostGameWins.team_name).toBe('C');
  });
});

describe('SeasonAccordion expanded paths', () => {
  // The first click on "Full Season Recap" remembers the season as open (session storage),
  // so a test must not inherit the previous test's open season.
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('renders error state', async () => {
    fetchSeasonStatsForAccordion.mockRejectedValueOnce(new Error('boom'));
    wrap(<SeasonAccordion season={season} />);
    fireEvent.click(screen.getByText('Full Season Recap'));
    expect(
      await screen.findByText('Failed to load season data', {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it('renders active empty state', async () => {
    fetchSeasonStatsForAccordion.mockResolvedValueOnce([]);
    wrap(<SeasonAccordion season={{ ...season, is_active: true }} />);
    fireEvent.click(screen.getByText('Full Season Recap'));
    expect(await screen.findByText('Season in progress – check back later')).toBeInTheDocument();
  });

  it('says so when a past season has no standings rows', async () => {
    fetchSeasonStatsForAccordion.mockResolvedValueOnce([]);
    wrap(<SeasonAccordion season={season} />);
    fireEvent.click(screen.getByText('Full Season Recap'));
    expect(await screen.findByText(EMPTY_SEASON_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText('Failed to load season data')).not.toBeInTheDocument();
    expect(screen.queryByText('Season in progress – check back later')).not.toBeInTheDocument();
  });

  it('shows the error, not the empty message, when a past season fails to load', async () => {
    fetchSeasonStatsForAccordion.mockRejectedValueOnce(new Error('boom'));
    wrap(<SeasonAccordion season={season} />);
    fireEvent.click(screen.getByText('Full Season Recap'));
    expect(
      await screen.findByText('Failed to load season data', {}, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_SEASON_MESSAGE)).not.toBeInTheDocument();
  });

  it('says so when a past season has only hidden divisions, and keeps the admin Edit button', async () => {
    fetchSeasonStatsForAccordion.mockResolvedValueOnce([makeRow('Hidden Alpha')]);
    wrap(<SeasonAccordion season={season} />);
    fireEvent.click(screen.getByText('Full Season Recap'));
    expect(await screen.findByText(EMPTY_SEASON_MESSAGE)).toBeInTheDocument();
    // The hidden teams still exist, so an admin must be able to move them.
    expect(screen.getByText('Edit Divisions')).toBeInTheDocument();
  });

  it('keeps its own text for an active season and does not show the empty message', async () => {
    fetchSeasonStatsForAccordion.mockResolvedValueOnce([]);
    wrap(<SeasonAccordion season={{ ...season, is_active: true }} />);
    fireEvent.click(screen.getByText('Full Season Recap'));
    expect(await screen.findByText('Season in progress – check back later')).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_SEASON_MESSAGE)).not.toBeInTheDocument();
  });

  it('shows the divisions, not the empty message, when a past season has standings', async () => {
    fetchSeasonStatsForAccordion.mockResolvedValueOnce([makeRow('Competitive')]);
    wrap(<SeasonAccordion season={season} />);
    fireEvent.click(screen.getByText('Full Season Recap'));
    expect(await screen.findByText('Competitive')).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_SEASON_MESSAGE)).not.toBeInTheDocument();
  });

  it('enters edit mode', async () => {
    fetchSeasonStatsForAccordion.mockResolvedValueOnce([
      {
        team_id: '2',
        division_name: 'Competitive',
        champion: false,
        team_name: 'B',
        match_wins: 1,
        match_losses: 1,
        game_wins: 2,
        game_losses: 2,
        power_score: 0.2,
        season_id: 's1',
        sos: null,
        runner_up: false,
        playoff_rank: null,
        team_logo_url: null,
        team_image_url: null,
      },
    ]);
    wrap(<SeasonAccordion season={season} />);
    fireEvent.click(await screen.findByText('Full Season Recap'));
    fireEvent.click(await screen.findByText('Edit Divisions'));
    expect(await screen.findByText('edit mode')).toBeInTheDocument();
  });
});

// The page keeps what is open in session storage, so Back from a team page lands on the same view.
describe('SeasonAccordion remembers what is open', () => {
  const STORAGE_KEY = 'history_open_state';
  const recap = () => screen.getByRole('button', { name: /full season recap/i });

  beforeEach(() => {
    sessionStorage.clear();
    fetchSeasonStatsForAccordion.mockReset();
    fetchSeasonStatsForAccordion.mockResolvedValue([makeRow('Competitive')]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts closed when nothing is remembered', () => {
    wrap(<SeasonAccordion season={season} />);

    expect(recap()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Competitive')).not.toBeInTheDocument();
  });

  it('opens a season this tab left open, on the first draw, with no click', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ 'season:s1': true }));

    wrap(<SeasonAccordion season={season} />);

    expect(recap()).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Competitive')).toBeInTheDocument();
  });

  it('remembers a season opened by hand across a new visit to the page', async () => {
    const first = wrap(<SeasonAccordion season={season} />);
    fireEvent.click(recap());
    expect(recap()).toHaveAttribute('aria-expanded', 'true');
    first.unmount();

    wrap(<SeasonAccordion season={season} />);

    expect(recap()).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Competitive')).toBeInTheDocument();
  });

  it('remembers a season closed again by hand', () => {
    const first = wrap(<SeasonAccordion season={season} />);
    fireEvent.click(recap());
    fireEvent.click(recap());
    first.unmount();

    wrap(<SeasonAccordion season={season} />);

    expect(recap()).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({ 'season:s1': false });
  });

  it('keeps one memory per season', () => {
    const first = wrap(<SeasonAccordion season={season} />);
    fireEvent.click(recap());
    first.unmount();

    wrap(<SeasonAccordion season={{ ...season, id: 's2' }} />);

    expect(recap()).toHaveAttribute('aria-expanded', 'false');
  });

  it.each([
    ['holds text that is not JSON', () => sessionStorage.setItem(STORAGE_KEY, '{oops')],
    ['holds a value of the wrong kind', () => sessionStorage.setItem(STORAGE_KEY, '"s1"')],
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
  ])('starts closed and still opens by hand when storage %s', async (_label, breakStorage) => {
    breakStorage();

    wrap(<SeasonAccordion season={season} />);
    expect(recap()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(recap());
    expect(recap()).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Competitive')).toBeInTheDocument();
  });

  it('lays the divisions out in one column at every width', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ 'season:s1': true }));

    wrap(<SeasonAccordion season={season} />);

    // Three columns squeezed each table to about 280px at 1024px wide, so Power and SOS
    // went behind a sideways scroll. The grid stays a single column.
    const grid = (await screen.findByText('Competitive')).parentElement as HTMLElement;
    expect(grid).toHaveClass('grid', 'grid-cols-1');
    expect(grid.className).not.toMatch(/(^|\s)(sm:|md:|lg:|xl:|2xl:)grid-cols-/);
  });
});

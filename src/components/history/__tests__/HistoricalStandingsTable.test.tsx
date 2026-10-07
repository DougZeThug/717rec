import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HistoricalStandingsTable from '../HistoricalStandingsTable';

const state = vi.hoisted(() => ({ isMobile: false, isWinterTheme: false }));
const powerScoreDisplayMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => state.isMobile }));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: state.isWinterTheme }),
}));
vi.mock('@/components/shared/TeamLogo', () => ({
  TeamLogo: ({ teamName, imageUrl }: { teamName: string; imageUrl?: string | null }) => (
    <span data-testid="logo" data-image-url={imageUrl ?? ''}>
      {teamName} logo
    </span>
  ),
}));
vi.mock('@/components/ui/entity-card', () => ({
  EntityCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="entity-card" className={className}>
      {children}
    </div>
  ),
}));
vi.mock('@/components/ui/PowerScoreDisplay', () => ({
  PowerScoreDisplay: (props: { score: number | null }) => {
    powerScoreDisplayMock(props);
    return <span data-testid="gauge" />;
  },
}));
// react-window draws nothing in jsdom, so the list renders every row itself and
// records the sizes it was given.
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

type Team = React.ComponentProps<typeof HistoricalStandingsTable>['teams'][number];

const team = (overrides: Partial<Team> = {}): Team => ({
  team_id: 't1',
  season_id: 's1',
  match_wins: 8,
  match_losses: 2,
  game_wins: 17,
  game_losses: 5,
  sos: 0.612,
  power_score: 0.82,
  champion: false,
  runner_up: false,
  division_name: 'Open',
  team_name: 'Falcons',
  team_logo_url: null,
  team_image_url: null,
  playoff_rank: 1,
  ...overrides,
});

/** Enough teams to pass the table's threshold of 30 for virtualizing. */
const manyTeams = (): Team[] =>
  Array.from({ length: 31 }, (_, i) => team({ team_id: `t${i}`, team_name: `Team ${i}` }));

describe('HistoricalStandingsTable', () => {
  beforeEach(() => {
    state.isMobile = false;
    state.isWinterTheme = false;
    powerScoreDisplayMock.mockClear();
  });

  it('says there are no standings when the season has no teams', () => {
    render(<HistoricalStandingsTable teams={[]} />);

    expect(screen.getByText('No Standings Available')).toBeInTheDocument();
  });

  describe.each([
    ['desktop', false],
    ['phone', true],
  ])('team picture on a %s', (_layout, isMobile) => {
    beforeEach(() => {
      state.isMobile = isMobile;
    });

    it('prefers the team image over the team logo', () => {
      render(
        <HistoricalStandingsTable
          teams={[
            team({
              team_image_url: 'https://x.test/image.png',
              team_logo_url: 'https://x.test/logo.png',
            }),
          ]}
        />
      );

      expect(screen.getByTestId('logo')).toHaveAttribute(
        'data-image-url',
        'https://x.test/image.png'
      );
    });

    it('falls back to the team logo when there is no team image', () => {
      render(
        <HistoricalStandingsTable
          teams={[team({ team_image_url: null, team_logo_url: 'https://x.test/logo.png' })]}
        />
      );

      expect(screen.getByTestId('logo')).toHaveAttribute(
        'data-image-url',
        'https://x.test/logo.png'
      );
    });

    it('passes no picture when the team has neither', () => {
      render(<HistoricalStandingsTable teams={[team()]} />);

      expect(screen.getByTestId('logo')).toHaveAttribute('data-image-url', '');
    });
  });

  describe('on a desktop', () => {
    it('shows a header and one row of numbers per team', () => {
      render(<HistoricalStandingsTable teams={[team()]} />);

      for (const heading of ['Rank', 'Team', 'W-L', 'Win%', 'Games', 'Game%', 'Power', 'SOS']) {
        expect(screen.getByText(heading)).toBeInTheDocument();
      }
      expect(screen.getByText('Falcons')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // playoff rank
      expect(screen.getByText('8-2')).toBeInTheDocument();
      expect(screen.getByText('80.0%')).toBeInTheDocument(); // 8 of 10 matches
      expect(screen.getByText('17-5')).toBeInTheDocument();
      expect(screen.getByText('77.3%')).toBeInTheDocument(); // 17 of 22 games
      expect(screen.getByText('82.0')).toBeInTheDocument(); // power score x 100
      expect(screen.getByText('0.612')).toBeInTheDocument();
      expect(screen.queryByTestId('virtualized')).not.toBeInTheDocument();
    });

    it('shows dashes for a team with no rank, power score or strength of schedule', () => {
      render(
        <HistoricalStandingsTable
          teams={[team({ playoff_rank: null, power_score: null, sos: null })]}
        />
      );

      expect(screen.getAllByText('-')).toHaveLength(3);
    });

    it('colours the win percentage by how good it is', () => {
      render(
        <HistoricalStandingsTable
          teams={[
            team({ team_id: 'a', team_name: 'A', match_wins: 8, match_losses: 2, game_wins: 17 }),
            team({
              team_id: 'b',
              team_name: 'B',
              match_wins: 6,
              match_losses: 4,
              game_wins: 7,
              game_losses: 5,
            }),
            team({
              team_id: 'c',
              team_name: 'C',
              match_wins: 5,
              match_losses: 5,
              game_wins: 4,
              game_losses: 6,
            }),
            team({
              team_id: 'd',
              team_name: 'D',
              match_wins: 1,
              match_losses: 9,
              game_wins: 1,
              game_losses: 11,
            }),
          ]}
        />
      );

      expect(screen.getByText('80.0%')).toHaveClass('text-green-600');
      expect(screen.getByText('60.0%')).toHaveClass('text-blue-600');
      expect(screen.getByText('50.0%')).toHaveClass('text-orange-500');
      expect(screen.getByText('10.0%')).toHaveClass('text-red-600');
    });

    it('shows 0.0% for a team that has played no matches or games', () => {
      render(
        <HistoricalStandingsTable
          teams={[
            team({ match_wins: 0, match_losses: 0, game_wins: 0, game_losses: 0, sos: null }),
          ]}
        />
      );

      expect(screen.getAllByText('0.0%')).toHaveLength(2);
    });

    it('marks the champion and the runner-up', () => {
      const { container } = render(
        <HistoricalStandingsTable
          teams={[
            team({ team_id: 'a', team_name: 'A', champion: true }),
            team({ team_id: 'b', team_name: 'B', runner_up: true }),
            team({ team_id: 'c', team_name: 'C' }),
          ]}
        />
      );

      expect(container.querySelectorAll('.border-l-yellow-400')).toHaveLength(1);
      expect(container.querySelectorAll('.border-l-gray-400')).toHaveLength(1);
      expect(container.querySelectorAll('.border-l-transparent')).toHaveLength(1);
    });

    it('uses the winter colours in the winter theme', () => {
      state.isWinterTheme = true;
      const { container } = render(
        <HistoricalStandingsTable
          teams={[
            team({ team_id: 'a', team_name: 'A', champion: true }),
            team({ team_id: 'b', team_name: 'B', runner_up: true }),
            team({ team_id: 'c', team_name: 'C' }),
          ]}
        />
      );

      expect(container.firstChild).toHaveClass('border-white/10');
      expect(container.querySelectorAll('.border-l-yellow-400')).toHaveLength(1);
      expect(container.querySelectorAll('.border-l-gray-400')).toHaveLength(1);
      expect(container.querySelectorAll('.border-l-transparent')).toHaveLength(1);
    });

    it('hands a long list to the virtualized list, 44px a row', () => {
      render(<HistoricalStandingsTable teams={manyTeams()} />);

      const list = screen.getByTestId('virtualized');
      expect(list).toHaveAttribute('data-row-height', '44');
      expect(list).toHaveAttribute('data-height', '500'); // 31 x 44 is capped at 500
      expect(list).toHaveAttribute('data-overscan', '5');
      expect(screen.getByText('Team 0')).toBeInTheDocument();
      expect(screen.getByText('Team 30')).toBeInTheDocument();
      expect(screen.getByText('Rank')).toBeInTheDocument(); // header stays above the list
    });

    it('uses the winter border around a long list in the winter theme', () => {
      state.isWinterTheme = true;
      const { container } = render(<HistoricalStandingsTable teams={manyTeams()} />);

      expect(container.firstChild).toHaveClass('border-white/10');
    });
  });

  describe('on a phone', () => {
    beforeEach(() => {
      state.isMobile = true;
    });

    it('shows one card per team with its record and stats', () => {
      render(
        <HistoricalStandingsTable
          teams={[team({ team_id: 'a', team_name: 'A' }), team({ team_id: 'b', team_name: 'B' })]}
        />
      );

      expect(screen.getAllByTestId('entity-card')).toHaveLength(2);
      expect(screen.getAllByText('8-2')).toHaveLength(2);
      expect(screen.getAllByText('80.0%')).toHaveLength(2);
      expect(screen.getAllByText('Win%')).toHaveLength(2);
      expect(screen.getAllByText('SOS')).toHaveLength(2);
      expect(screen.getAllByText('0.612')).toHaveLength(2);
      expect(screen.getAllByText('Games')).toHaveLength(2);
      expect(screen.getAllByText('17-5')).toHaveLength(2);
      expect(screen.getAllByText('Game%')).toHaveLength(2);
      expect(screen.getAllByText('77.3%')).toHaveLength(2);
      expect(screen.queryByTestId('virtualized')).not.toBeInTheDocument();
    });

    it('draws the power score gauge with its label', () => {
      render(<HistoricalStandingsTable teams={[team({ power_score: 0.82 })]} />);

      expect(powerScoreDisplayMock).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 0.82,
          source: 'team_season_stats',
          display: 'gauge',
          showLabel: true,
        })
      );
    });

    it('shows a dash for a missing strength of schedule and 0.0% with no matches or games', () => {
      render(
        <HistoricalStandingsTable
          teams={[
            team({ match_wins: 0, match_losses: 0, game_wins: 0, game_losses: 0, sos: null }),
          ]}
        />
      );

      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.getAllByText('0.0%')).toHaveLength(2);
    });

    it('marks the champion and the runner-up with a coloured edge', () => {
      render(
        <HistoricalStandingsTable
          teams={[
            team({ team_id: 'a', team_name: 'A', champion: true }),
            team({ team_id: 'b', team_name: 'B', runner_up: true }),
          ]}
        />
      );

      const [champion, runnerUp] = screen.getAllByTestId('entity-card');
      expect(champion).toHaveClass('border-l-yellow-400');
      expect(runnerUp).toHaveClass('border-l-gray-400');
    });

    it('uses the winter colours in the winter theme', () => {
      state.isWinterTheme = true;
      render(<HistoricalStandingsTable teams={[team()]} />);

      expect(screen.getByText('Falcons')).toHaveClass('text-white');
    });

    it('hands a long list to the virtualized list, 140px a card', () => {
      render(<HistoricalStandingsTable teams={manyTeams()} />);

      const list = screen.getByTestId('virtualized');
      expect(list).toHaveAttribute('data-row-height', '140');
      expect(list).toHaveAttribute('data-height', '600'); // 31 x 140 is capped at 600
      expect(list).toHaveAttribute('data-overscan', '3');
      expect(screen.getByText('Team 0')).toBeInTheDocument();
      expect(screen.getByText('Team 30')).toBeInTheDocument();
    });
  });
});

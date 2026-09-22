import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { TeamComparisonView } from '@/components/compare/TeamComparisonView';
import type { TeamPercentiles } from '@/hooks/useLeaguePercentiles';
import type { TeamComparisonSide } from '@/hooks/useTeamComparison';
import type { PercentileResult } from '@/utils/percentileUtils';

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

type Record2 = { wins: number; losses: number };

const UNMEASURED: PercentileResult = { value: 0, percentile: 0, rank: 0, total: 0 };

const ranked = (rank: number): PercentileResult => ({
  value: rank,
  percentile: 90,
  rank,
  total: 12,
});

/** Distinct ranks per stat, so each badge can be told apart on screen. */
const allRanked = (overrides: Partial<TeamPercentiles> = {}): TeamPercentiles => ({
  winPercentage: ranked(1),
  gameWinPercentage: ranked(2),
  powerScore: ranked(3),
  sos: ranked(4),
  sweepRate: ranked(5),
  championships: ranked(6),
  playoffWinPercentage: ranked(7),
  ...overrides,
});

interface SideOverrides {
  percentiles?: TeamPercentiles | null;
  playoff?: Record2;
  competitive?: Record2;
  intermediate?: Record2;
  recreational?: Record2;
  career?: Record2;
}

const side = (name: string, o: SideOverrides = {}): TeamComparisonSide => {
  const career = o.career ?? { wins: 10, losses: 5 };
  const playoff = o.playoff ?? { wins: 0, losses: 0 };
  return {
    id: name,
    name,
    logoUrl: null,
    percentiles: o.percentiles ?? null,
    winPct: 0,
    gameWinPct: 0,
    totals: {
      career_match_wins: career.wins,
      career_match_losses: career.losses,
      career_game_wins: 0,
      career_game_losses: 0,
      career_playoff_wins: playoff.wins,
      career_playoff_losses: playoff.losses,
      championships: 0,
      runner_ups: 0,
      career_power_score: 0,
      career_sweep_rate: 0,
      career_sweeps: 0,
      career_sos: 0,
      division_records: {
        competitive: o.competitive ?? { wins: 0, losses: 0 },
        intermediate: o.intermediate ?? { wins: 0, losses: 0 },
        recreational: o.recreational ?? { wins: 0, losses: 0 },
      },
    },
  };
};

/** The winning side of a row is the one drawn in the primary colour. */
const isMarkedAhead = (text: string) => screen.getByText(text).className.includes('text-primary');

describe('TeamComparisonView record rows', () => {
  // Ranking on the wins alone read "3" against "2" and marked the 3-9 team
  // ahead. The row shows a record, so it is judged as one.
  it('marks 2-0 ahead of 3-9 on the playoff record', () => {
    render(
      <TeamComparisonView
        team1={side('Alpha', { career: { wins: 10, losses: 5 }, playoff: { wins: 2, losses: 0 } })}
        team2={side('Beta', { career: { wins: 20, losses: 1 }, playoff: { wins: 3, losses: 9 } })}
        headToHead={null}
      />
    );

    expect(isMarkedAhead('2-0')).toBe(true);
    expect(isMarkedAhead('3-9')).toBe(false);
  });

  it('marks 4-0 ahead of 5-20 on a division record', () => {
    render(
      <TeamComparisonView
        team1={side('Alpha', {
          career: { wins: 10, losses: 5 },
          competitive: { wins: 4, losses: 0 },
        })}
        team2={side('Beta', {
          career: { wins: 20, losses: 1 },
          competitive: { wins: 5, losses: 20 },
        })}
        headToHead={null}
      />
    );

    expect(isMarkedAhead('4-0')).toBe(true);
    expect(isMarkedAhead('5-20')).toBe(false);
  });

  // A team that has not played in a tier rates 0, so it does not win the row.
  it('does not mark an unplayed tier ahead of a losing one', () => {
    render(
      <TeamComparisonView
        team1={side('Alpha', {
          career: { wins: 10, losses: 5 },
          intermediate: { wins: 0, losses: 0 },
        })}
        team2={side('Beta', {
          career: { wins: 20, losses: 1 },
          intermediate: { wins: 1, losses: 3 },
        })}
        headToHead={null}
      />
    );

    expect(isMarkedAhead('1-3')).toBe(true);
  });

  it('leaves neither side marked when two records rate the same', () => {
    render(
      <TeamComparisonView
        team1={side('Alpha', { career: { wins: 10, losses: 5 }, playoff: { wins: 1, losses: 1 } })}
        team2={side('Beta', { career: { wins: 20, losses: 1 }, playoff: { wins: 4, losses: 4 } })}
        headToHead={null}
      />
    );

    expect(isMarkedAhead('1-1')).toBe(false);
    expect(isMarkedAhead('4-4')).toBe(false);
  });
});

describe('TeamComparisonView percentile badges', () => {
  // Sweep rate, the playoff record and the championship count each had a
  // percentile worked out on every page load and shown on no screen at all.
  it('badges the sweep rate, the playoff record and the championships', () => {
    render(
      <TeamComparisonView
        team1={side('Alpha', { percentiles: allRanked() })}
        team2={side('Beta')}
        headToHead={null}
      />
    );

    expect(screen.getByText('5th')).toBeInTheDocument();
    expect(screen.getByText('7th')).toBeInTheDocument();
    expect(screen.getByText('6th')).toBeInTheDocument();
  });

  // A team with no playoff match is not ranked on playoff win percentage. It
  // gets no badge rather than the bottom one.
  it('shows no playoff badge for a team that has never reached the playoffs', () => {
    render(
      <TeamComparisonView
        team1={side('Alpha', {
          percentiles: allRanked({ playoffWinPercentage: UNMEASURED }),
        })}
        team2={side('Beta')}
        headToHead={null}
      />
    );

    expect(screen.getByText('5th')).toBeInTheDocument();
    expect(screen.queryByText('7th')).not.toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('shows no badges at all when the league percentiles are unavailable', () => {
    render(<TeamComparisonView team1={side('Alpha')} team2={side('Beta')} headToHead={null} />);

    expect(screen.queryByText('5th')).not.toBeInTheDocument();
    expect(screen.queryByText('6th')).not.toBeInTheDocument();
    expect(screen.queryByText('7th')).not.toBeInTheDocument();
  });
});

describe('TeamComparisonView head-to-head', () => {
  const played = {
    team1Wins: 7,
    team2Wins: 5,
    gameWins1: 20,
    gameWins2: 18,
    lastPlayed: null,
    isFirstMeeting: false,
  };

  it('says First Meeting only when the teams really have not played', () => {
    render(
      <TeamComparisonView
        team1={side('Alpha')}
        team2={side('Beta')}
        headToHead={{ ...played, team1Wins: 0, team2Wins: 0, isFirstMeeting: true }}
      />
    );

    expect(screen.getByText('First Meeting')).toBeInTheDocument();
  });

  // "We could not read it" and "they have never played" are different claims.
  // The page used to make the second when only the first was true.
  it('says the record is unavailable rather than First Meeting when the read failed', () => {
    render(
      <TeamComparisonView
        team1={side('Alpha')}
        team2={side('Beta')}
        headToHead={null}
        headToHeadError
      />
    );

    expect(screen.getByText('Head-to-Head Unavailable')).toBeInTheDocument();
    expect(screen.queryByText('First Meeting')).not.toBeInTheDocument();
  });

  it('shows the record when there is one', () => {
    render(<TeamComparisonView team1={side('Alpha')} team2={side('Beta')} headToHead={played} />);

    expect(screen.getByText('Head-to-Head')).toBeInTheDocument();
    expect(screen.queryByText('Head-to-Head Unavailable')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RecapFactsV1, RecapTeamGrade } from '@/types/recapEdition';

import PackWarnings from '../PackWarnings';

const team = (overrides: Partial<RecapTeamGrade> = {}): RecapTeamGrade => ({
  rank: 1,
  previousRank: 2,
  teamId: 't-1',
  teamName: 'Bag Chasers',
  logoUrl: null,
  division: 'Competitive',
  grade: 'A',
  gpa: 3.8,
  categories: [],
  wins: 6,
  losses: 2,
  powerScore: 72.4,
  delta: 2.1,
  ...overrides,
});

const facts = (overrides: Partial<RecapFactsV1> = {}): RecapFactsV1 => ({
  factsSchemaVersion: 2,
  seasonId: 's-1',
  seasonName: 'Fall 2026',
  seasonSlug: 'fall-2026',
  weekNumber: 6,
  weekStartIso: '2026-10-09T04:00:00.000Z',
  weekEndIso: '2026-10-16T04:00:00.000Z',
  upsets: [],
  hotStreaks: [],
  movers: { basis: 'compared', currentWeek: 6, previousWeek: 5, risers: [], faller: null },
  teamOfTheWeek: null,
  divisions: [],
  powerRankings: [],
  unresolvedMatchCount: 0,
  generatedAt: '2026-10-16T12:00:00.000Z',
  ...overrides,
});

describe('PackWarnings', () => {
  it('says nothing when the week is clean', () => {
    const { container } = render(<PackWarnings facts={facts()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('blocks publishing when the week has no snapshot', () => {
    render(
      <PackWarnings
        facts={facts({
          movers: {
            basis: 'missing',
            currentWeek: 6,
            previousWeek: null,
            risers: [],
            faller: null,
          },
        })}
      />
    );

    expect(screen.getByText('No power score snapshot for week 6')).toBeInTheDocument();
    // Named so an admin knows what to run, rather than a generic failure.
    expect(screen.getByText(/capture-power-snapshots/)).toBeInTheDocument();
  });

  it('names the week actually compared against when one is missing', () => {
    render(
      <PackWarnings
        facts={facts({
          movers: { basis: 'gap', currentWeek: 6, previousWeek: 4, risers: [], faller: null },
        })}
      />
    );

    expect(screen.getByText('Compared against week 4')).toBeInTheDocument();
  });

  it('explains that the first week has nothing to compare against', () => {
    render(
      <PackWarnings
        facts={facts({
          movers: {
            basis: 'baseline',
            currentWeek: 1,
            previousWeek: null,
            risers: [],
            faller: null,
          },
        })}
      />
    );

    expect(screen.getByText('Nothing to compare against yet')).toBeInTheDocument();
  });

  it('counts matches with no result, and gets the plural right', () => {
    render(<PackWarnings facts={facts({ unresolvedMatchCount: 1 })} />);
    expect(screen.getByText('1 match still have no result')).toBeInTheDocument();
  });

  it('warns when every team would show a dash instead of an arrow', () => {
    render(
      <PackWarnings
        facts={facts({
          powerRankings: [
            team({ teamId: 'a', previousRank: null }),
            team({ teamId: 'b', previousRank: null }),
          ],
        })}
      />
    );

    expect(screen.getByText('The power rankings will show no movement')).toBeInTheDocument();
    // Not blocking: the ranks and grades are still correct.
    expect(screen.getByText(/ranks and grades are still correct/)).toBeInTheDocument();
  });

  it('warns about only the teams that are new to the rankings', () => {
    render(
      <PackWarnings
        facts={facts({
          powerRankings: [
            team({ teamId: 'a', previousRank: 1 }),
            team({ teamId: 'b', previousRank: null }),
            team({ teamId: 'c', previousRank: null }),
          ],
        })}
      />
    );

    expect(screen.getByText('2 teams joined the rankings this week')).toBeInTheDocument();
    // Not the "no movement at all" case — some teams do have a previous rank.
    expect(screen.queryByText('The power rankings will show no movement')).not.toBeInTheDocument();
  });

  it('uses the singular for one new team', () => {
    render(
      <PackWarnings
        facts={facts({
          powerRankings: [
            team({ teamId: 'a', previousRank: 1 }),
            team({ teamId: 'b', previousRank: null }),
          ],
        })}
      />
    );

    expect(screen.getByText('1 team joined the rankings this week')).toBeInTheDocument();
  });

  it('says nothing about movement when every team has a previous rank', () => {
    render(
      <PackWarnings
        facts={facts({ powerRankings: [team({ teamId: 'a' }), team({ teamId: 'b', rank: 2 })] })}
      />
    );

    expect(screen.queryByText(/joined the rankings/)).not.toBeInTheDocument();
    expect(screen.queryByText(/show no movement/)).not.toBeInTheDocument();
  });

  it('says nothing about movement for an edition with no rankings at all', () => {
    // An edition published before power rankings existed.
    const { container } = render(<PackWarnings facts={facts({ powerRankings: undefined })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows several warnings at once', () => {
    render(
      <PackWarnings
        facts={facts({
          unresolvedMatchCount: 3,
          movers: { basis: 'gap', currentWeek: 6, previousWeek: 4, risers: [], faller: null },
          powerRankings: [team({ teamId: 'a', previousRank: null })],
        })}
      />
    );

    expect(screen.getByText('Compared against week 4')).toBeInTheDocument();
    expect(screen.getByText('3 matches still have no result')).toBeInTheDocument();
    expect(screen.getByText('The power rankings will show no movement')).toBeInTheDocument();
  });
});

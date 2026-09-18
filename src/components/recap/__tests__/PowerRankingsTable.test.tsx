import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RecapTeamGrade } from '@/types/recapEdition';

import PowerRankingsTable from '../PowerRankingsTable';

const team = (overrides: Partial<RecapTeamGrade> = {}): RecapTeamGrade => ({
  rank: 1,
  previousRank: 1,
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

describe('PowerRankingsTable', () => {
  it('renders every team with its rank, grade and record', () => {
    render(
      <PowerRankingsTable
        teams={[
          team({ teamId: 'a', teamName: 'Alpha', rank: 1 }),
          team({ teamId: 'b', teamName: 'Beta', rank: 2, grade: 'C+', wins: 4, losses: 4 }),
        ]}
      />
    );

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('C+')).toBeInTheDocument();
    expect(screen.getByText('4–4')).toBeInTheDocument();
  });

  it('shows places gained and lost', () => {
    render(
      <PowerRankingsTable
        teams={[
          team({ teamId: 'up', rank: 1, previousRank: 4 }),
          team({ teamId: 'down', rank: 2, previousRank: 1 }),
        ]}
      />
    );

    // 4th to 1st is three places gained; 1st to 2nd is one lost.
    expect(screen.getByText('▲3')).toBeInTheDocument();
    expect(screen.getByLabelText('Up 3 places')).toBeInTheDocument();
    expect(screen.getByText('▼1')).toBeInTheDocument();
    expect(screen.getByLabelText('Down 1 place')).toBeInTheDocument();
  });

  it('shows a dash rather than an arrow when there is no previous week', () => {
    render(<PowerRankingsTable teams={[team({ previousRank: null })]} />);

    expect(screen.getByTitle('No previous week to compare with')).toBeInTheDocument();
    expect(screen.queryByText(/[▲▼]/)).not.toBeInTheDocument();
  });

  it('shows a dash rather than a letter for an unrated team', () => {
    render(<PowerRankingsTable teams={[team({ grade: null, powerScore: null })]} />);

    // The grade cell and the power cell both read as unmeasured.
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('shows the full blurb, with no one-line clamp', () => {
    const long =
      'A properly long line about this team that would be cut off on the exported graphic but has room to breathe here.';

    render(<PowerRankingsTable teams={[team({ teamId: 'a' })]} blurbs={{ a: long }} />);

    expect(screen.getByText(long)).toBeInTheDocument();
  });

  it('renders a team with no blurb written for it', () => {
    render(<PowerRankingsTable teams={[team()]} blurbs={{}} />);
    expect(screen.getByText('Bag Chasers')).toBeInTheDocument();
  });

  it('renders nothing for an edition published before power rankings existed', () => {
    const { container } = render(<PowerRankingsTable teams={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not re-sort the frozen rows', () => {
    // The facts arrive ranked. Re-sorting here could disagree with the exported
    // graphic, which reads the same array.
    render(
      <PowerRankingsTable
        teams={[
          team({ teamId: 'a', teamName: 'First', rank: 1, powerScore: 10 }),
          team({ teamId: 'b', teamName: 'Second', rank: 2, powerScore: 99 }),
        ]}
      />
    );

    const rows = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent ?? '');
    expect(rows[0]).toContain('First');
    expect(rows[1]).toContain('Second');
  });
});

import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';
import type { TimeBlockTeamsMap } from '@/types/autoSchedule';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { TeamLoadingStep } from '../TeamLoadingStep';

/** `count` teams named `<prefix>1`, `<prefix>2` and so on. */
const makeTeams = (prefix: string, count: number): Team[] =>
  Array.from({ length: count }, (_, index) =>
    createMockTeam({ id: `${prefix}${index + 1}`, name: `${prefix}${index + 1}` })
  );

const renderStep = (timeBlockTeams: TimeBlockTeamsMap, unmatchedTeamIds?: string[]) => {
  const totalTeams = Object.values(timeBlockTeams).reduce((sum, teams) => sum + teams.length, 0);
  const oddBlocks = Object.values(timeBlockTeams).filter((teams) => teams.length % 2 !== 0).length;
  return render(
    <TeamLoadingStep
      isLoading={false}
      selectedDate={new Date(2026, 10, 19, 12)}
      timeBlockTeams={timeBlockTeams}
      totalTeams={totalTeams}
      unmatchedTeamIds={unmatchedTeamIds}
      oddBlocks={oddBlocks}
      onLoadTeams={vi.fn()}
      onGenerateSchedule={vi.fn()}
    />
  );
};

describe('TeamLoadingStep preview (Match Creation page)', () => {
  it('shows no unmatched or fix-it line for blocks with an even number of teams', () => {
    renderStep({ Early: makeTeams('A', 4), Mid: makeTeams('B', 2) });

    expect(screen.queryByText(/Unmatched Teams:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Blocks to Fix:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Odd number of teams detected')).not.toBeInTheDocument();
  });

  it('says Generate will stop for an odd block of 3, and does not promise an unmatched team', () => {
    renderStep({ Early: makeTeams('A', 3) });

    expect(screen.getByText(/Blocks to Fix:/)).toHaveTextContent(
      'Blocks to Fix: 1Generate will stop until each has an even number of teams. ' +
        'Move a team, or use Dual Match Mode on the Auto Schedule screen.'
    );
    // The old promise: one team is left out and named.
    expect(screen.queryByText(/Unmatched Teams:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Teams that won't be matched:")).not.toBeInTheDocument();
  });

  it('counts each odd block of 3 or more once', () => {
    renderStep({ Early: makeTeams('A', 5), Mid: makeTeams('B', 4), Late: makeTeams('C', 3) });

    expect(screen.getByText(/Blocks to Fix:/)).toHaveTextContent('Blocks to Fix: 2');
  });

  it('counts a team alone in its block as unmatched and names it, with no fix-it line', () => {
    renderStep({ Early: makeTeams('A', 4), Mid: makeTeams('L', 1) });

    expect(screen.getByText(/Unmatched Teams:/)).toHaveTextContent('Unmatched Teams: 1');
    expect(screen.queryByText(/Blocks to Fix:/)).not.toBeInTheDocument();
    expect(screen.getByText("Teams that won't be matched:")).toBeInTheDocument();
    expect(screen.getAllByText('L1').length).toBeGreaterThan(0);
    expect(screen.getByText(/in Mid/)).toBeInTheDocument();
  });

  it('names only the lone team when a night has a lone team and an odd block of 3', () => {
    renderStep({ Early: makeTeams('A', 3), Mid: makeTeams('L', 1) });

    expect(screen.getByText(/Unmatched Teams:/)).toHaveTextContent('Unmatched Teams: 1');
    expect(screen.getByText(/Blocks to Fix:/)).toHaveTextContent('Blocks to Fix: 1');
    // The list under "Teams that won't be matched" holds the lone team and not a team from
    // the 3-team block, which Generate refuses instead of leaving a team out.
    expect(screen.getByText(/in Mid/)).toBeInTheDocument();
    expect(screen.queryByText(/in Early/)).not.toBeInTheDocument();
  });
});

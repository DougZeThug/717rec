import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { PlayoffPageData } from '../../hooks/usePlayoffPageData';
import AdminView from '../AdminView';

// The brackets tab pulls in the whole bracket stack; this test only cares about
// the Teams tab, so the two heavy children are stubbed out.
vi.mock('../../BracketList', () => ({ default: () => <div data-testid="bracket-list" /> }));
vi.mock('../../BracketDetail', () => ({ default: () => <div data-testid="bracket-detail" /> }));

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const makeData = (overrides: Partial<PlayoffPageData>): PlayoffPageData =>
  ({
    profile: null,
    isAdmin: true,
    selectedBracketId: null,
    setSelectedBracketId: vi.fn(),
    ready: true,
    error: null,
    divisionsError: null,
    bracketsError: null,
    selectedBracketError: null,
    retrySelectedBracket: vi.fn(),
    divisions: [],
    divisionsLoading: false,
    availableDivisions: ['Competitive'],
    allBrackets: [],
    bracketsLoading: false,
    teamsByDivision: {},
    bracketsByDivision: {},
    typesafeBracketsByDivision: {},
    allBracketsData: [],
    handleBracketCreated: vi.fn(),
    handleTeamDivisionChange: vi.fn(),
    refetchBrackets: vi.fn(),
    bracket: null,
    teams: [],
    teamsLoading: false,
    deleteBracket: vi.fn(),
    isLoading: false,
    selectedSeasonId: 's1',
    setSelectedSeasonId: vi.fn(),
    ...overrides,
  }) as PlayoffPageData;

const renderTeamsTab = (overrides: Partial<PlayoffPageData>) => {
  sessionStorage.setItem('playoffViewActiveTab', 'teams');
  return render(
    <MemoryRouter>
      <AdminView
        bracketDialogOpen={false}
        setBracketDialogOpen={vi.fn()}
        onCreateBracket={vi.fn()}
        onDeleteBracket={vi.fn()}
        onEditMatch={vi.fn()}
        data={makeData(overrides)}
      />
    </MemoryRouter>
  );
};

// The teams list comes from its own query, so it can still be in flight after
// brackets, divisions and the admin check have all settled. While it is, the
// list is an empty array - and telling an admin "No teams have been added" is
// wrong, because nobody knows that yet.
describe('AdminView teams tab while the teams query is still loading', () => {
  it('shows a skeleton, not the empty-state warning', () => {
    renderTeamsTab({ isLoading: false, teamsLoading: true, teams: [] });

    expect(screen.queryByText('No Teams Available')).not.toBeInTheDocument();
  });

  it('still warns once the teams query has settled on an empty list', () => {
    renderTeamsTab({ isLoading: false, teamsLoading: false, teams: [] });

    expect(screen.getByText('No Teams Available')).toBeInTheDocument();
  });
});

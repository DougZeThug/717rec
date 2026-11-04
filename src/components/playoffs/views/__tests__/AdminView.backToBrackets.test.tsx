import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlayoffPageData } from '../../hooks/usePlayoffPageData';
import AdminView from '../AdminView';

// The admin Brackets tab had the same dead end as the public page: once a
// bracket was open, nothing led back to the division list. This view cannot be
// opened in a browser without an admin sign-in, so this test is its only check.
vi.mock('../../BracketList', () => ({ default: () => <div data-testid="bracket-list" /> }));
vi.mock('../../BracketDetail', () => ({ default: () => <div data-testid="bracket-detail" /> }));

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  sessionStorage.setItem('playoffViewActiveTab', 'brackets');
});

afterEach(() => {
  vi.restoreAllMocks();
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

const renderBracketsTab = (overrides: Partial<PlayoffPageData>) =>
  render(
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

const BACK = { name: 'Back to brackets' };

/** True when `first` comes before `second` in the page. */
const isBefore = (first: HTMLElement, second: HTMLElement) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('AdminView "Back to brackets" button', () => {
  it('shows above an open bracket, and a tap clears the choice', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const setSelectedBracketId = vi.fn();
    renderBracketsTab({
      selectedBracketId: 'bracket-1',
      bracket: { id: 'bracket-1' } as PlayoffPageData['bracket'],
      setSelectedBracketId,
    });

    const button = screen.getByRole('button', BACK);
    expect(isBefore(button, screen.getByTestId('bracket-detail'))).toBe(true);

    await userEvent.click(button);

    expect(setSelectedBracketId).toHaveBeenCalledTimes(1);
    expect(setSelectedBracketId).toHaveBeenCalledWith(null);
  });

  it('does not show beside the division list when no bracket is chosen', () => {
    renderBracketsTab({});

    expect(screen.getByTestId('bracket-list')).toBeInTheDocument();
    expect(screen.queryByRole('button', BACK)).not.toBeInTheDocument();
  });

  it('does not show while the chosen bracket has not arrived and the list is still on screen', () => {
    renderBracketsTab({ selectedBracketId: 'bracket-1', bracket: undefined });

    expect(screen.queryByRole('button', BACK)).not.toBeInTheDocument();
  });

  // A bracket that loaded stays on screen when a later refresh fails (the query
  // keeps its old data), and the error banner shows above it with its own button.
  it('keeps exactly one button when a loaded bracket stays up after a failed refresh', () => {
    renderBracketsTab({
      selectedBracketId: 'bracket-1',
      bracket: { id: 'bracket-1' } as PlayoffPageData['bracket'],
      selectedBracketError: 'refresh failed',
    });

    expect(screen.getByTestId('bracket-detail')).toBeInTheDocument();
    expect(screen.getAllByRole('button', BACK)).toHaveLength(1);
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Once a reader opened a bracket, nothing on the page led back to the division
// list: only the error banner had a "Back to brackets" button. A slow or stuck
// load had no way out either. The button now shows whenever the list is hidden
// (the loading spinner and the open bracket) and never beside the list.
vi.mock('@/components/playoffs/BracketList', () => ({
  default: () => <div data-testid="bracket-list">Bracket list</div>,
}));

vi.mock('@/components/playoffs/BracketDetail', () => ({
  default: () => <div data-testid="bracket-detail">Bracket detail</div>,
}));

import type { PlayoffPageData } from '../../hooks/usePlayoffPageData';
import PlayoffView from '../PlayoffView';

const makeData = (overrides: Partial<PlayoffPageData> = {}): PlayoffPageData =>
  ({
    profile: null,
    isAdmin: false,
    selectedBracketId: null,
    setSelectedBracketId: vi.fn(),
    ready: false,
    error: null,
    divisionsError: null,
    bracketsError: null,
    selectedBracketError: null,
    retrySelectedBracket: vi.fn(),
    divisions: [],
    divisionsLoading: false,
    availableDivisions: [],
    bracketsLoading: false,
    teamsByDivision: {},
    bracketsByDivision: {},
    typesafeBracketsByDivision: {},
    handleBracketCreated: vi.fn(),
    handleTeamDivisionChange: vi.fn(),
    // vi.fn() alone returns undefined, not a promise; this sets the resolved value.
    refetchBrackets: vi.fn().mockResolvedValue(undefined), // skipcq: JS-W1042
    bracket: null,
    teams: [],
    teamsLoading: false,
    deleteBracket: vi.fn(),
    isLoading: false,
    selectedSeasonId: null,
    setSelectedSeasonId: vi.fn(),
    ...overrides,
  }) as unknown as PlayoffPageData;

const renderView = (data: PlayoffPageData) =>
  render(
    <PlayoffView
      bracketDialogOpen={false}
      setBracketDialogOpen={vi.fn()}
      onCreateBracket={vi.fn()}
      onDeleteBracket={vi.fn()}
      data={data}
    />
  );

const BACK = { name: 'Back to brackets' };

/** True when `first` comes before `second` in the page. */
const isBefore = (first: HTMLElement, second: HTMLElement) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PlayoffView "Back to brackets" button', () => {
  it('shows above an open bracket, and a tap clears the choice and starts at the top', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const setSelectedBracketId = vi.fn();
    renderView(
      makeData({
        selectedBracketId: 'bracket-1',
        ready: true,
        bracket: { id: 'bracket-1' } as PlayoffPageData['bracket'],
        setSelectedBracketId,
      })
    );

    const button = screen.getByRole('button', BACK);
    expect(isBefore(button, screen.getByTestId('bracket-detail'))).toBe(true);

    await userEvent.click(button);

    expect(setSelectedBracketId).toHaveBeenCalledTimes(1);
    expect(setSelectedBracketId).toHaveBeenCalledWith(null);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it('shows above the "Loading bracket..." spinner, so a slow load has a way back', async () => {
    const setSelectedBracketId = vi.fn();
    renderView(
      makeData({ selectedBracketId: 'bracket-1', bracket: undefined, setSelectedBracketId })
    );

    const button = screen.getByRole('button', BACK);
    expect(screen.getByRole('status')).toHaveTextContent('Loading bracket...');
    expect(isBefore(button, screen.getByRole('status'))).toBe(true);

    await userEvent.click(button);
    expect(setSelectedBracketId).toHaveBeenCalledWith(null);
  });

  it('does not show beside the division list when no bracket is chosen', () => {
    renderView(makeData());

    expect(screen.getByTestId('bracket-list')).toBeInTheDocument();
    expect(screen.queryByRole('button', BACK)).not.toBeInTheDocument();
  });

  it('keeps exactly one button, the error banner one, when the bracket failed to load', () => {
    renderView(
      makeData({
        selectedBracketId: 'bracket-1',
        bracket: undefined,
        selectedBracketError: 'bracket fetch exploded',
      })
    );

    expect(screen.getAllByRole('button', BACK)).toHaveLength(1);
  });

  it('does not show when a legacy bracket loaded as "nothing there" and the list is back', () => {
    renderView(makeData({ selectedBracketId: 'bracket-1', bracket: null }));

    expect(screen.getByTestId('bracket-list')).toBeInTheDocument();
    expect(screen.queryByRole('button', BACK)).not.toBeInTheDocument();
  });
});

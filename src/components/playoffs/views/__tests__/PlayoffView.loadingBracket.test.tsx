import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Tapping "View Live Bracket" used to look like nothing happened: the bracket
// loads for a moment, and until it arrived the page kept showing the division
// list the reader had just tapped. While the bracket is on its way the page now
// says so, and the list is out of the way.
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
    closeBracket: vi.fn(),
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

/** The list stays mounted while a bracket is open; the wrapper's `hidden` class hides it. */
const listIsHidden = () =>
  screen.getByTestId('bracket-list').parentElement?.className.includes('hidden');

describe('PlayoffView while the chosen bracket loads', () => {
  it('says the bracket is loading and hides the division list', () => {
    renderView(makeData({ selectedBracketId: 'bracket-1', bracket: undefined }));

    expect(screen.getByRole('status')).toHaveTextContent('Loading bracket...');
    expect(listIsHidden()).toBe(true);
    expect(screen.queryByTestId('bracket-detail')).not.toBeInTheDocument();
  });

  it('shows the list and no spinner when no bracket is chosen', () => {
    renderView(makeData());

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(listIsHidden()).toBe(false);
  });

  it('does not spin for ever when the bracket loaded as "nothing there"', () => {
    // A legacy or removed bracket settles with no data and no error. Waiting for
    // a bracket that will never come would leave the reader on a spinner.
    renderView(makeData({ selectedBracketId: 'bracket-1', bracket: null }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(listIsHidden()).toBe(false);
  });

  it('shows the failure, not the spinner, when the bracket failed to load', () => {
    renderView(
      makeData({
        selectedBracketId: 'bracket-1',
        bracket: undefined,
        selectedBracketError: 'bracket fetch exploded',
      })
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('bracket fetch exploded')).toBeInTheDocument();
    expect(listIsHidden()).toBe(false);
  });

  it('shows the bracket, not the spinner, once it has loaded', () => {
    renderView(
      makeData({
        selectedBracketId: 'bracket-1',
        ready: true,
        bracket: { id: 'bracket-1' } as PlayoffPageData['bracket'],
      })
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('bracket-detail')).toBeInTheDocument();
    expect(listIsHidden()).toBe(true);
  });
});

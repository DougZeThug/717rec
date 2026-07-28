import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// A bracket that fails to load used to be invisible: `ready` stayed false, so
// BracketDetail (and the error state inside BracketView) never mounted and the
// page silently fell back to the list with ?bracket=<id> still in the URL.
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
    allBrackets: [],
    bracketsLoading: false,
    teamsByDivision: {},
    bracketsByDivision: {},
    typesafeBracketsByDivision: {},
    allBracketsData: [],
    handleBracketCreated: vi.fn(),
    handleTeamDivisionChange: vi.fn(),
    refetchBrackets: vi.fn().mockResolvedValue(undefined),
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

describe('PlayoffView error surfacing', () => {
  it('shows the failure instead of silently falling back to the bracket list', () => {
    renderView(
      makeData({
        selectedBracketId: 'bracket-1',
        selectedBracketError: 'bracket fetch exploded',
      })
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('bracket fetch exploded')).toBeInTheDocument();
    expect(screen.getByText('Loading bracket')).toBeInTheDocument();
    // The detail view still cannot render — that is why the message matters.
    expect(screen.queryByTestId('bracket-detail')).not.toBeInTheDocument();
  });

  it('retries the failed bracket fetch', async () => {
    const retrySelectedBracket = vi.fn();
    renderView(
      makeData({
        selectedBracketId: 'bracket-1',
        selectedBracketError: 'boom',
        retrySelectedBracket,
      })
    );

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retrySelectedBracket).toHaveBeenCalledTimes(1);
  });

  it('clears the stuck selection so a refresh stops retrying the same bracket', async () => {
    const setSelectedBracketId = vi.fn();
    renderView(
      makeData({
        selectedBracketId: 'bracket-1',
        selectedBracketError: 'boom',
        setSelectedBracketId,
      })
    );

    await userEvent.click(screen.getByRole('button', { name: /back to brackets/i }));
    expect(setSelectedBracketId).toHaveBeenCalledWith(null);
  });

  it('surfaces list-level failures that previously had no reader', async () => {
    const refetchBrackets = vi.fn().mockResolvedValue(undefined);
    renderView(
      makeData({
        bracketsError: 'brackets down',
        divisionsError: 'divisions down',
        error: 'something else broke',
        refetchBrackets,
      })
    );

    expect(screen.getByText('brackets down')).toBeInTheDocument();
    expect(screen.getByText('divisions down')).toBeInTheDocument();
    expect(screen.getByText('something else broke')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetchBrackets).toHaveBeenCalledTimes(1);
  });

  it('renders nothing extra when every query succeeded', () => {
    renderView(makeData());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('bracket-list')).toBeInTheDocument();
  });
});

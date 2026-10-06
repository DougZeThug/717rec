import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '@/types/errors';

type BracketInfo = {
  id?: string;
  title?: string;
  state?: string;
  uses_brackets_manager?: boolean;
  bracket_data?: unknown;
  matches?: unknown;
  teams?: unknown[];
};

const mocks = vi.hoisted(() => ({
  queryOptions: undefined as
    { queryKey: unknown[]; enabled: boolean; queryFn: () => Promise<unknown> } | undefined,
  info: { data: null, isLoading: false, error: null } as {
    data: BracketInfo | null;
    isLoading: boolean;
    error: Error | null;
  },
  legacy: {
    data: null,
    isLoading: false,
    error: null,
    refetch: undefined as unknown as ReturnType<typeof vi.fn>,
    loadingProgress: { label: 'Loading bracket', percent: 50 },
  } as {
    data: BracketInfo | null;
    isLoading: boolean;
    error: Error | null;
    refetch: ReturnType<typeof vi.fn>;
    loadingProgress: { label: string; percent: number };
  },
  realtime: { realtimeEnabled: false, lastUpdate: null as Date | null },
  useBracketsManagerRealtime: vi.fn(),
  useBracketCompletion: vi.fn(),
  fetchBracketInfo: vi.fn(),
  viewer: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: NonNullable<typeof mocks.queryOptions>) => {
    mocks.queryOptions = options;
    return mocks.info;
  },
}));

vi.mock('@/hooks/brackets/useBracketData', () => ({
  useBracketData: () => mocks.legacy,
}));

vi.mock('@/hooks/brackets/useBracketsManagerRealtime', () => ({
  useBracketsManagerRealtime: (bracketId: string | null) => {
    mocks.useBracketsManagerRealtime(bracketId);
    return mocks.realtime;
  },
}));

vi.mock('@/hooks/useBracketCompletion', () => ({
  useBracketCompletion: (bracketId: string | undefined) => mocks.useBracketCompletion(bracketId),
}));

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBracketInfo: (id: string) => mocks.fetchBracketInfo(id),
}));

// Stub every logger export, so no log call can fail a test.
vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(actual).map((key) => [key, vi.fn()]));
});

vi.mock('../viewer', () => ({
  BracketsViewerComponent: (props: {
    bracket: { id?: string };
    teams: unknown[];
    onMatchClick?: (id: string) => void;
    refreshSignal: number | null;
    realtimeEnabled: boolean;
  }) => {
    mocks.viewer(props);
    return (
      <div data-testid="viewer" data-bracket-id={props.bracket.id}>
        <button onClick={() => props.onMatchClick?.('match-1')}>Edit match</button>
      </div>
    );
  },
}));

vi.mock('../FinalStandings', () => ({
  FinalStandings: ({ bracketId, show }: { bracketId: string; show: boolean }) => (
    <div data-testid="final-standings" data-bracket-id={bracketId} data-show={String(show)} />
  ),
}));

import { errorLog } from '@/utils/logger';

import BracketView from '../BracketView';

const teams = [
  { id: 'team-1', name: 'Alpha', seed: 1 },
  { id: 'team-2', name: 'Bravo', seed: 2 },
];

const legacyBracket = (overrides: Record<string, unknown> = {}) =>
  ({ id: 'legacy', state: 'in_progress', matches: [], ...overrides }) as never;

const lastViewerProps = () => mocks.viewer.mock.lastCall?.[0];

describe('BracketView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryOptions = undefined;
    mocks.info = { data: null, isLoading: false, error: null };
    mocks.legacy = {
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      loadingProgress: { label: 'Loading bracket', percent: 50 },
    };
    mocks.realtime = { realtimeEnabled: false, lastUpdate: null };
  });

  describe('invalid bracket id', () => {
    it.each([
      ['empty', ''],
      ['blank', '   '],
    ])('shows the invalid-id message for a %s id', (_l, id) => {
      render(<BracketView bracketId={id} />);

      expect(screen.getByText('Invalid bracket ID')).toBeInTheDocument();
      expect(
        screen.getByText('Cannot display bracket without a valid identifier.')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
    });

    it('still shows the invalid-id message when a bracket prop is given', () => {
      render(<BracketView bracketId="" bracket={legacyBracket()} />);

      expect(screen.getByText('Invalid bracket ID')).toBeInTheDocument();
      expect(errorLog).toHaveBeenCalledWith('Invalid bracketId', { bracketId: '' });
    });

    it('passes undefined to the completion hook for an empty id, and the id otherwise', () => {
      const { unmount } = render(<BracketView bracketId="" />);
      expect(mocks.useBracketCompletion).toHaveBeenLastCalledWith(undefined);
      unmount();

      render(<BracketView bracketId="bracket-1" />);
      expect(mocks.useBracketCompletion).toHaveBeenLastCalledWith('bracket-1');
    });
  });

  describe('loading', () => {
    it.each([
      ['the info query', () => (mocks.info.isLoading = true)],
      ['the bracket query', () => (mocks.legacy.isLoading = true)],
    ])('shows progress while %s is loading', (_label, setLoading) => {
      setLoading();
      mocks.legacy.loadingProgress = { label: 'Fetching matches', percent: 70 };

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByText('Fetching matches')).toBeInTheDocument();
      expect(screen.getByText('70% complete')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows the bracket prop instead of the loader', () => {
      mocks.info.isLoading = true;
      mocks.legacy.isLoading = true;

      render(<BracketView bracketId="bracket-1" bracket={legacyBracket()} />);

      expect(screen.getByTestId('viewer')).toBeInTheDocument();
      expect(screen.queryByText('Loading bracket')).not.toBeInTheDocument();
    });

    it('shows a JSONB bracket instead of the loader', () => {
      mocks.legacy.isLoading = true;
      mocks.info.data = { id: 'jsonb', uses_brackets_manager: true, bracket_data: { stage: 1 } };

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByTestId('viewer')).toBeInTheDocument();
    });
  });

  describe('error', () => {
    it.each([
      [
        'the info query',
        () => (mocks.info.error = new Error('relation "brackets" does not exist')),
      ],
      [
        'the bracket query',
        () => (mocks.legacy.error = new Error('relation "brackets" does not exist')),
      ],
    ])('shows a safe message when %s fails', (_label, setError) => {
      setError();

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByText('Failed to load bracket. Please try again.')).toBeInTheDocument();
      expect(screen.queryByText(/relation/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    it('keeps the reason when the error carries a safe one', () => {
      mocks.legacy.error = new ValidationError('Bracket is locked');

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByText('Failed to load bracket: Bracket is locked')).toBeInTheDocument();
    });

    it('prefers the info error over the bracket error', () => {
      mocks.info.error = new ValidationError('Info problem');
      mocks.legacy.error = new ValidationError('Bracket problem');

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByText('Failed to load bracket: Info problem')).toBeInTheDocument();
    });

    it('retries by refetching the bracket', async () => {
      mocks.legacy.error = new Error('boom');

      render(<BracketView bracketId="bracket-1" />);
      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

      await waitFor(() => expect(mocks.legacy.refetch).toHaveBeenCalledTimes(1));
    });

    it('swallows a failed retry and logs it', async () => {
      mocks.legacy.error = new Error('boom');
      const retryError = new Error('still down');
      mocks.legacy.refetch.mockRejectedValue(retryError);

      render(<BracketView bracketId="bracket-1" />);
      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

      await waitFor(() =>
        expect(errorLog).toHaveBeenCalledWith('Manual retry failed:', retryError)
      );
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    it('shows the bracket prop instead of the error', () => {
      mocks.legacy.error = new Error('boom');

      render(<BracketView bracketId="bracket-1" bracket={legacyBracket()} />);

      expect(screen.getByTestId('viewer')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
    });

    it('shows a JSONB bracket instead of the error', () => {
      mocks.legacy.error = new Error('boom');
      mocks.info.data = { id: 'jsonb', uses_brackets_manager: true, bracket_data: { stage: 1 } };

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByTestId('viewer')).toBeInTheDocument();
    });

    it('shows loading before the error when both apply', () => {
      mocks.info.isLoading = true;
      mocks.legacy.error = new Error('boom');

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByText('Loading bracket')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
    });
  });

  describe('no bracket', () => {
    it('shows the empty state with the id that was tried', () => {
      render(<BracketView bracketId="missing-bracket" />);

      expect(screen.getByText('No bracket selected')).toBeInTheDocument();
      expect(screen.getByText('Attempted to load bracket: missing-bracket')).toBeInTheDocument();
      expect(
        screen.getByText('The bracket may have been deleted or you may not have access to it.')
      ).toBeInTheDocument();
    });

    it('does not treat a non-JSONB info row as a bracket', () => {
      mocks.info.data = { id: 'info', uses_brackets_manager: false, bracket_data: { stage: 1 } };

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByText('No bracket selected')).toBeInTheDocument();
    });

    it('does not treat a JSONB flag without data as a bracket', () => {
      mocks.info.data = { id: 'info', uses_brackets_manager: true, bracket_data: null };

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByText('No bracket selected')).toBeInTheDocument();
    });
  });

  describe('corrupt data', () => {
    it.each([
      ['has no matches', { id: 'fetched', state: 'in_progress' }],
      [
        'has matches that are not an array',
        { id: 'fetched', state: 'in_progress', matches: 'nope' },
      ],
      ['has null matches', { id: 'fetched', state: 'in_progress', matches: null }],
    ])('shows a data error when the fetched bracket %s', (_label, fetched) => {
      mocks.legacy.data = fetched;

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByText('Data Structure Error')).toBeInTheDocument();
      expect(screen.getByText('Bracket found but matches data is corrupted')).toBeInTheDocument();
      expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
    });

    it('shows a data error for a bracket prop without matches', () => {
      render(<BracketView bracketId="bracket-1" bracket={legacyBracket({ matches: undefined })} />);

      expect(screen.getByText('Data Structure Error')).toBeInTheDocument();
    });

    it('does not check matches for a JSONB bracket', () => {
      mocks.info.data = { id: 'jsonb', uses_brackets_manager: true, bracket_data: { stage: 1 } };

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByTestId('viewer')).toBeInTheDocument();
      expect(screen.queryByText('Data Structure Error')).not.toBeInTheDocument();
    });
  });

  describe('which bracket is shown', () => {
    const jsonb = { id: 'jsonb', uses_brackets_manager: true, bracket_data: { stage: 1 } };
    const fetched = { id: 'fetched', state: 'in_progress', matches: [] };

    it('prefers the bracket prop over a JSONB bracket and a fetched bracket', () => {
      mocks.info.data = jsonb;
      mocks.legacy.data = fetched;

      render(<BracketView bracketId="bracket-1" bracket={legacyBracket()} />);

      expect(screen.getByTestId('viewer')).toHaveAttribute('data-bracket-id', 'legacy');
    });

    it('prefers a JSONB bracket over a fetched bracket', () => {
      mocks.info.data = jsonb;
      mocks.legacy.data = fetched;

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByTestId('viewer')).toHaveAttribute('data-bracket-id', 'jsonb');
    });

    it('uses the fetched bracket otherwise', () => {
      mocks.legacy.data = fetched;

      render(<BracketView bracketId="bracket-1" />);

      expect(screen.getByTestId('viewer')).toHaveAttribute('data-bracket-id', 'fetched');
    });
  });

  describe('viewer props', () => {
    it("uses the bracket's own teams when it has them", () => {
      const own = [{ id: 'own', name: 'Own' }];

      render(
        <BracketView bracketId="bracket-1" bracket={legacyBracket({ teams: own })} teams={teams} />
      );

      expect(lastViewerProps().teams).toEqual(own);
    });

    it('falls back to the teams prop, then to an empty list', () => {
      const { unmount } = render(
        <BracketView bracketId="bracket-1" bracket={legacyBracket()} teams={teams} />
      );
      expect(lastViewerProps().teams).toEqual(teams);
      unmount();

      render(<BracketView bracketId="bracket-1" bracket={legacyBracket()} />);
      expect(lastViewerProps().teams).toEqual([]);
    });

    it('falls back to the teams prop when the bracket teams are null', () => {
      render(
        <BracketView bracketId="bracket-1" bracket={legacyBracket({ teams: null })} teams={teams} />
      );

      expect(lastViewerProps().teams).toEqual(teams);
    });

    it('sends match clicks to onEditMatch', () => {
      const onEditMatch = vi.fn();

      render(
        <BracketView bracketId="bracket-1" bracket={legacyBracket()} onEditMatch={onEditMatch} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Edit match' }));

      expect(onEditMatch).toHaveBeenCalledWith('match-1');
    });

    it('ignores match clicks when there is no onEditMatch', () => {
      render(<BracketView bracketId="bracket-1" bracket={legacyBracket()} />);

      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: 'Edit match' }))
      ).not.toThrow();
    });

    it('passes the realtime state through', () => {
      mocks.realtime = { realtimeEnabled: true, lastUpdate: new Date('2026-01-15T12:00:00Z') };

      render(<BracketView bracketId="bracket-1" bracket={legacyBracket()} />);

      expect(lastViewerProps()).toMatchObject({
        realtimeEnabled: true,
        refreshSignal: new Date('2026-01-15T12:00:00Z').getTime(),
      });
    });

    it('sends a null refresh signal before any realtime update', () => {
      render(<BracketView bracketId="bracket-1" bracket={legacyBracket()} />);

      expect(lastViewerProps()).toMatchObject({ realtimeEnabled: false, refreshSignal: null });
    });

    it('shows an invalid-data message when the bracket has no id', () => {
      render(<BracketView bracketId="bracket-1" bracket={legacyBracket({ id: undefined })} />);

      expect(screen.getByText('Invalid bracket data')).toBeInTheDocument();
      expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
      expect(screen.getByTestId('final-standings')).toBeInTheDocument();
    });
  });

  describe('final standings', () => {
    it('is shown only for a completed bracket, and gets the bracket id', () => {
      const { unmount } = render(
        <BracketView bracketId="bracket-1" bracket={legacyBracket({ state: 'completed' })} />
      );
      expect(screen.getByTestId('final-standings')).toHaveAttribute('data-show', 'true');
      expect(screen.getByTestId('final-standings')).toHaveAttribute('data-bracket-id', 'bracket-1');
      unmount();

      render(
        <BracketView bracketId="bracket-1" bracket={legacyBracket({ state: 'in_progress' })} />
      );
      expect(screen.getByTestId('final-standings')).toHaveAttribute('data-show', 'false');
    });
  });

  describe('data hooks', () => {
    it.each([
      ['a bracket-manager bracket', { id: 'b', uses_brackets_manager: true }, 'bracket-1'],
      ['a legacy bracket', { id: 'b', uses_brackets_manager: false }, null],
      ['no bracket info yet', null, null],
    ])('subscribes to realtime updates for %s as expected', (_label, info, expected) => {
      mocks.info.data = info;

      render(<BracketView bracketId="bracket-1" bracket={legacyBracket()} />);

      expect(mocks.useBracketsManagerRealtime).toHaveBeenLastCalledWith(expected);
    });

    it('queries bracket info by id', async () => {
      mocks.fetchBracketInfo.mockResolvedValue({
        id: 'bracket-1',
        title: 'Rec Championship',
        uses_brackets_manager: false,
        bracket_data: null,
      });

      render(<BracketView bracketId="bracket-1" />);

      expect(mocks.queryOptions?.queryKey).toEqual(['bracket-info', 'bracket-1']);
      expect(mocks.queryOptions?.enabled).toBe(true);
      await expect(mocks.queryOptions?.queryFn()).resolves.toMatchObject({ id: 'bracket-1' });
      expect(mocks.fetchBracketInfo).toHaveBeenCalledWith('bracket-1');
    });

    it('disables the info query for an empty id', () => {
      render(<BracketView bracketId="" />);

      expect(mocks.queryOptions?.enabled).toBe(false);
    });
  });
});

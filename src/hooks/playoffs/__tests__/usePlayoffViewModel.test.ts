import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayoffViewModel } from '../usePlayoffViewModel';

vi.mock('../usePlayoffBracketData', () => ({ usePlayoffBracketData: vi.fn() }));
vi.mock('../usePlayoffMatches', () => ({ usePlayoffMatches: vi.fn() }));
vi.mock('../usePlayoffTeams', () => ({ usePlayoffTeams: vi.fn() }));
vi.mock('../usePlayoffActions', () => ({ usePlayoffActions: vi.fn() }));

import { usePlayoffActions } from '../usePlayoffActions';
import { usePlayoffBracketData } from '../usePlayoffBracketData';
import { usePlayoffMatches } from '../usePlayoffMatches';
import { usePlayoffTeams } from '../usePlayoffTeams';

const mockedBracket = vi.mocked(usePlayoffBracketData);
const mockedMatches = vi.mocked(usePlayoffMatches);
const mockedTeams = vi.mocked(usePlayoffTeams);
const mockedActions = vi.mocked(usePlayoffActions);

/**
 * A real bracket id is mandatory: usePlayoffViewModel returns hardcoded safe
 * defaults (error: null, teams: []) for a null/blank id, which would make
 * every assertion below pass vacuously.
 */
const BRACKET_ID = 'bracket-1';

type QueryStub = { data?: unknown; isLoading?: boolean; error?: unknown; refetch?: () => unknown };

/** Minimal TanStack-shaped stub; each mock casts it to its own query type. */
const stubQuery = (overrides: QueryStub = {}): unknown => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

const setup = (opts: { bracket?: QueryStub; matches?: QueryStub; teams?: QueryStub } = {}) => {
  mockedBracket.mockReturnValue(
    stubQuery({ data: { id: BRACKET_ID }, ...opts.bracket }) as ReturnType<
      typeof usePlayoffBracketData
    >
  );
  mockedMatches.mockReturnValue(
    stubQuery({ data: [], ...opts.matches }) as ReturnType<typeof usePlayoffMatches>
  );
  mockedTeams.mockReturnValue(
    stubQuery({ data: [], ...opts.teams }) as ReturnType<typeof usePlayoffTeams>
  );
  return renderHook(() => usePlayoffViewModel(BRACKET_ID));
};

describe('usePlayoffViewModel error aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedActions.mockReturnValue({
      deleteBracket: vi.fn(),
      updateMatchResult: vi.fn(),
      isDeleting: false,
    } as unknown as ReturnType<typeof usePlayoffActions>);
  });

  it('returns no error when all three queries succeed', () => {
    const { result } = setup();

    expect(result.current.error).toBeNull();
  });

  it('propagates a teams fetch error', () => {
    const { result } = setup({ teams: { error: new Error('Teams request failed') } });

    expect(result.current.error).toBe('Teams request failed');
  });

  it('propagates bracket and matches fetch errors', () => {
    const bracketFailure = setup({ bracket: { error: new Error('Bracket request failed') } });
    expect(bracketFailure.result.current.error).toBe('Bracket request failed');

    const matchesFailure = setup({ matches: { error: new Error('Matches request failed') } });
    expect(matchesFailure.result.current.error).toBe('Matches request failed');
  });

  it('prefers the bracket error when several queries fail at once', () => {
    const { result } = setup({
      bracket: { error: new Error('Bracket request failed') },
      matches: { error: new Error('Matches request failed') },
      teams: { error: new Error('Teams request failed') },
    });

    expect(result.current.error).toBe('Bracket request failed');
  });

  it('tolerates a query stub that omits the error key entirely', () => {
    // Existing suites (e.g. usePlayoffPageData.season-default) mock these
    // hooks without an `error` property, so `undefined` must read as no error.
    const { result } = setup({ teams: { error: undefined } });

    expect(result.current.error).toBeNull();
  });

  it('keeps the bracket usable when only teams fail', () => {
    const { result } = setup({ teams: { data: undefined, error: new Error('Teams down') } });

    expect(result.current.error).toBe('Teams down');
    expect(result.current.bracket).not.toBeNull();
    expect(result.current.teams).toEqual([]);
  });
});

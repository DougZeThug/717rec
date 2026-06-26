import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Radix dialogs/selects expect these browser APIs in jsdom.
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  configurable: true,
  value: vi.fn(() => false),
});
Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  configurable: true,
  value: vi.fn(),
});
Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  configurable: true,
  value: vi.fn(),
});
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
});

let mockBracketInfoQuery = {
  data: null as null | { uses_brackets_manager?: boolean; bracket_data?: unknown },
  isLoading: false,
  error: null as Error | null,
};

let mockBracketData = {
  data: null as unknown,
  isLoading: false,
  error: null as Error | null,
  refetch: vi.fn(),
  loadingProgress: { label: 'Loading bracket', percent: 50 },
};

const mockHandleEditMatch = vi.fn();
const mockBracketsViewer = vi.fn(
  ({
    bracket,
    teams,
    onMatchClick,
  }: {
    bracket: { name: string };
    teams: unknown[];
    onMatchClick?: (id: string) => void;
  }) => (
    <div role="region" aria-label={`Mock bracket ${bracket.name}`} data-team-count={teams.length}>
      <button onClick={() => onMatchClick?.('match-1')}>Edit match score</button>
    </div>
  )
);

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => mockBracketInfoQuery,
}));

vi.mock('@/hooks/brackets/useBracketData', () => ({
  useBracketData: () => mockBracketData,
}));

vi.mock('@/hooks/brackets/useBracketsManagerRealtime', () => ({
  useBracketsManagerRealtime: () => ({ realtimeEnabled: false, lastUpdate: null }),
}));

vi.mock('@/hooks/useBracketCompletion', () => ({
  useBracketCompletion: vi.fn(),
}));

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBracketInfo: vi.fn(),
  fetchBracketParticipants: vi.fn(),
  fetchFinalStandings: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  log: vi.fn(),
}));

vi.mock('@/components/playoffs/viewer', () => ({
  BracketsViewerComponent: (props: Parameters<typeof mockBracketsViewer>[0]) =>
    mockBracketsViewer(props),
}));

vi.mock('@/components/playoffs/FinalStandings', () => ({
  FinalStandings: ({ show }: { show: boolean }) =>
    show ? <div data-testid="final-standings">Final standings visible</div> : null,
}));

vi.mock('@/components/playoffs/ChampionDisplay', () => ({
  default: ({
    championId,
    teams,
  }: {
    championId?: string | null;
    teams: Array<{ id: string; name: string }>;
  }) =>
    championId ? (
      <div data-testid="champion-display">
        Champion: {teams.find((team) => team.id === championId)?.name}
      </div>
    ) : null,
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: true }),
}));

vi.mock('@/hooks/useRecalculateStandings', () => ({
  useRecalculateStandings: () => ({ recalculate: vi.fn(), isRecalculating: false }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('@/components/playoffs/SeedingUpdateDialog', () => ({
  SeedingUpdateDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Seeding dialog</div> : null,
}));

vi.mock('@/components/playoffs/hooks/usePlayoffHandlers', () => ({
  usePlayoffHandlers: () => ({ handleEditMatch: mockHandleEditMatch }),
}));

import BracketView from '../../BracketView';
import AdminView from '../AdminView';

const teams = [
  { id: 'team-1', name: 'Alpha', seed: 1 },
  { id: 'team-2', name: 'Bravo', seed: 2 },
];

const bracket = {
  id: 'bracket-1',
  name: 'Rec Championship',
  division: 'Recreational',
  format: 'single_elimination',
  state: 'in_progress',
  champion: null,
  matches: [
    {
      id: 'match-1',
      round: 1,
      position: 1,
      team1Id: 'team-1',
      team2Id: 'team-2',
      winnerId: null,
      matchType: 'winners' as const,
      bestOf: 3,
      bracket_id: 'bracket-1',
      status: 'pending' as const,
    },
  ],
};

const makeAdminData = (overrides = {}) => ({
  profile: null,
  isAdmin: true,
  selectedBracketId: null,
  setSelectedBracketId: vi.fn(),
  ready: true,
  error: null,
  divisionsError: null,
  bracketsError: null,
  divisions: [],
  divisionsLoading: false,
  availableDivisions: ['Recreational'],
  allBrackets: [],
  bracketsLoading: false,
  teamsByDivision: {},
  bracketsByDivision: {},
  typesafeBracketsByDivision: { Recreational: [bracket] },
  allBracketsData: [],
  handleBracketCreated: vi.fn(),
  handleTeamDivisionChange: vi.fn(),
  refetchBrackets: vi.fn(),
  bracket: null,
  teams,
  teamsLoading: false,
  deleteBracket: vi.fn(),
  isLoading: false,
  selectedSeasonId: null,
  setSelectedSeasonId: vi.fn(),
  ...overrides,
});

describe('bracket display and admin interaction views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockBracketInfoQuery = { data: null, isLoading: false, error: null };
    mockBracketData = {
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      loadingProgress: { label: 'Loading bracket', percent: 50 },
    };
  });

  it('shows the bracket loading progress while bracket data is loading', () => {
    mockBracketInfoQuery.isLoading = true;
    mockBracketData.isLoading = true;

    render(<BracketView bracketId="bracket-1" />);

    expect(screen.getByText('Loading bracket')).toBeInTheDocument();
    expect(screen.getByText('50% complete')).toBeInTheDocument();
  });

  it('shows an empty/no bracket state when no displayable bracket is available', () => {
    render(<BracketView bracketId="missing-bracket" />);

    expect(screen.getByText('No bracket selected')).toBeInTheDocument();
    expect(screen.getByText('Attempted to load bracket: missing-bracket')).toBeInTheDocument();
  });

  it('renders a visible bracket and routes match score editing entry points', () => {
    const onEditMatch = vi.fn();

    render(
      <BracketView
        bracketId="bracket-1"
        bracket={bracket}
        teams={teams}
        onEditMatch={onEditMatch}
      />
    );

    expect(
      screen.getByRole('region', { name: 'Mock bracket Rec Championship' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit match score' }));
    expect(onEditMatch).toHaveBeenCalledWith('match-1');
  });

  it('shows final standings for completed brackets', () => {
    render(
      <BracketView
        bracketId="bracket-1"
        bracket={{ ...bracket, state: 'completed' }}
        teams={teams}
      />
    );

    expect(screen.getByTestId('final-standings')).toHaveTextContent('Final standings visible');
  });

  it('shows AdminView loading and empty/no bracket list states', () => {
    const { rerender } = render(
      <AdminView
        bracketDialogOpen={false}
        setBracketDialogOpen={vi.fn()}
        onCreateBracket={vi.fn()}
        onDeleteBracket={vi.fn()}
        data={makeAdminData({ isLoading: true })}
      />
    );

    expect(document.querySelectorAll('[class*="h-40"]').length).toBeGreaterThan(0);

    rerender(
      <AdminView
        bracketDialogOpen={false}
        setBracketDialogOpen={vi.fn()}
        onCreateBracket={vi.fn()}
        onDeleteBracket={vi.fn()}
        data={makeAdminData({ availableDivisions: [], typesafeBracketsByDivision: {} })}
      />
    );

    expect(screen.getByText('No Playoff Brackets Yet')).toBeInTheDocument();
  });

  it('renders the selected AdminView bracket with admin actions, score editing, and champion state', () => {
    render(
      <AdminView
        bracketDialogOpen={false}
        setBracketDialogOpen={vi.fn()}
        onCreateBracket={vi.fn()}
        onDeleteBracket={vi.fn()}
        data={makeAdminData({
          selectedBracketId: 'bracket-1',
          bracket: { ...bracket, state: 'completed', champion: 'team-1' },
        })}
      />
    );

    expect(screen.getAllByText('Rec Championship').length).toBeGreaterThan(0);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByTestId('champion-display')).toHaveTextContent('Champion: Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Edit match score' }));
    expect(mockHandleEditMatch).toHaveBeenCalledWith('match-1');
  });
});

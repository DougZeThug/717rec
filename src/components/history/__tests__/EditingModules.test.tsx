import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import SeasonAccordion from '../SeasonAccordion';
import EditModeContainer from '../editing/EditModeContainer';

const {
  mockToast,
  mockUseAdminAccess,
  mockUseSeasonData,
  mockUpdateStats,
  mockResetChanges,
  mockOnSave,
  mockOnCancel,
} = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockUseAdminAccess: vi.fn(),
  mockUseSeasonData: vi.fn(),
  mockUpdateStats: vi.fn(),
  mockResetChanges: vi.fn(),
  mockOnSave: vi.fn(),
  mockOnCancel: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({ toast: mockToast }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));
vi.mock('../editing/EditableDivisionPanel', () => ({
  default: ({ divisionName }: { divisionName: string }) => <div data-testid={`division-${divisionName}`} />,
}));
vi.mock('../editing/AddDivisionButton', () => ({
  default: () => <div data-testid="add-division" />,
}));
vi.mock('../editing/TeamDragOverlay', () => ({
  default: () => null,
}));

vi.mock('@/hooks/history/useUpdateSeasonStats', () => ({
  useUpdateSeasonStats: () => ({
    updateStats: mockUpdateStats,
    isUpdating: false,
    error: null,
  }),
}));

vi.mock('../hooks/useHistoryEditing', () => ({
  useHistoryEditing: () => ({
    teams: [
      {
        team_id: 't1',
        season_id: 's1',
        team_name: 'Alpha',
        team_logo_url: null,
        team_image_url: null,
        division_name: 'Competitive',
        playoff_rank: 1,
        match_wins: 1,
        match_losses: 0,
        game_wins: 2,
        game_losses: 0,
        sos: null,
        power_score: null,
        champion: false,
        runner_up: false,
      },
    ],
    divisions: ['Competitive'],
    moveTeam: vi.fn(),
    reorderTeamInDivision: vi.fn(),
    addDivision: vi.fn(),
    renameDivision: vi.fn(),
    removeDivision: vi.fn(() => true),
    getTeamsByDivision: vi.fn(() => []),
    hasChanges: true,
    getChanges: vi.fn(() => [
      {
        team_id: 't1',
        season_id: 's1',
        division_name: 'Competitive',
        playoff_rank: 1,
      },
    ]),
    resetChanges: mockResetChanges,
  }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: () => mockUseSeasonData(),
  };
});

const createWrapper = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

const season = {
  id: 's1',
  name: 'Spring',
  start_date: '2025-01-01',
  end_date: '2025-02-01',
  is_active: false,
};

const seasonData = [
  {
    team_id: 't1',
    season_id: 's1',
    match_wins: 1,
    match_losses: 0,
    game_wins: 2,
    game_losses: 0,
    sos: null,
    power_score: null,
    champion: false,
    runner_up: false,
    division_name: 'Competitive',
    playoff_rank: 1,
    team_name: 'Alpha',
    team_logo_url: null,
    team_image_url: null,
  },
];

describe('history editing modules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSeasonData.mockReturnValue({
      data: seasonData,
      isLoading: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(),
      isRefetching: false,
    });
  });

  it('shows edit button only for admins and enters edit mode', () => {
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true });
    createWrapper(<SeasonAccordion season={season} />);

    fireEvent.click(screen.getByRole('button', { name: /full season recap/i }));
    fireEvent.click(screen.getByRole('button', { name: /edit divisions/i }));

    expect(screen.getByText(/save changes/i)).toBeInTheDocument();
  });

  it('hides edit button when admin access is not granted', () => {
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    createWrapper(<SeasonAccordion season={season} />);

    fireEvent.click(screen.getByRole('button', { name: /full season recap/i }));
    expect(screen.queryByRole('button', { name: /edit divisions/i })).not.toBeInTheDocument();
  });

  it('applies save changes and exits on cancel', async () => {
    mockUpdateStats.mockResolvedValue(true);
    createWrapper(
      <EditModeContainer
        seasonId="s1"
        seasonData={seasonData}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(mockUpdateStats).toHaveBeenCalledTimes(1));
    expect(mockOnSave).toHaveBeenCalledTimes(1);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });

  it('handles invalid edit payload failure with rollback/error messaging', async () => {
    mockUpdateStats.mockResolvedValue(false);
    createWrapper(
      <EditModeContainer
        seasonId="s1"
        seasonData={seasonData}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateStats).toHaveBeenCalledTimes(1));
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText(/1 unsaved change/i)).toBeInTheDocument();
  });
});

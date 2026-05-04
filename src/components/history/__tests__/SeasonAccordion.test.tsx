import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import SeasonAccordion from '../SeasonAccordion';
import { SeasonData, useSeasonAccordionViewModel } from '../useSeasonAccordionViewModel';

vi.mock('@/hooks/useSeasonalTheme', () => ({ useSeasonalThemeBase: () => ({ isWinterTheme: false }) }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => ({ isAdminAccessGranted: true }) }));

const { fetchSeasonStatsForAccordion } = vi.hoisted(() => ({ fetchSeasonStatsForAccordion: vi.fn() }));
vi.mock('@/services/SeasonService', () => ({ SeasonService: { fetchSeasonStatsForAccordion } }));
vi.mock('../SeasonMetaBar', () => ({ default: () => <div>meta bar</div> }));
vi.mock('../DivisionPanel', () => ({ default: ({ divisionName }: { divisionName: string }) => <div>{divisionName}</div> }));
vi.mock('../editing/EditModeContainer', () => ({ default: () => <div>edit mode</div> }));

const season = { id: 's1', name: 'Spring', start_date: '2025-01-01', end_date: '2025-03-01', is_active: false };
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

describe('useSeasonAccordionViewModel', () => {
  it('excludes hidden divisions from groups and team counts, computes highlights', () => {
    const data: SeasonData[] = [
      { team_id: '1', division_name: 'Hidden Alpha', champion: true, team_name: 'A', match_wins: 5, match_losses: 1, game_wins: 11, game_losses: 3, power_score: 0.5, season_id: 's1', sos: null, runner_up: false, playoff_rank: null, team_logo_url: null, team_image_url: null },
      { team_id: '2', division_name: 'Competitive', champion: false, team_name: 'B', match_wins: 9, match_losses: 1, game_wins: 7, game_losses: 3, power_score: 0.9, season_id: 's1', sos: null, runner_up: false, playoff_rank: null, team_logo_url: null, team_image_url: null },
      { team_id: '3', division_name: 'Casual', champion: false, team_name: 'C', match_wins: 3, match_losses: 5, game_wins: 15, game_losses: 8, power_score: 0.2, season_id: 's1', sos: null, runner_up: false, playoff_rank: null, team_logo_url: null, team_image_url: null },
    ];

    const { result } = renderHook(() => useSeasonAccordionViewModel(season, data));
    expect(result.current.teamCount).toBe(2);
    expect(Object.keys(result.current.divisionData)).toEqual(['Competitive', 'Casual']);
    expect(result.current.highlights.mostWins.team_name).toBe('B');
    expect(result.current.highlights.highestPS.team_name).toBe('B');
    expect(result.current.highlights.mostGameWins.team_name).toBe('C');
  });
});

describe('SeasonAccordion expanded paths', () => {
  it('renders error state', async () => {
    fetchSeasonStatsForAccordion.mockRejectedValueOnce(new Error('boom'));
    wrap(<SeasonAccordion season={season} />);
    fireEvent.click(screen.getByText('Full Season Recap'));
    expect(await screen.findByText('Failed to load season data', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('renders active empty state', async () => {
    fetchSeasonStatsForAccordion.mockResolvedValueOnce([]);
    wrap(<SeasonAccordion season={{ ...season, is_active: true }} />);
    fireEvent.click(screen.getByText('Full Season Recap'));
    expect(await screen.findByText('Season in progress – check back later')).toBeInTheDocument();
  });

  it('enters edit mode', async () => {
    fetchSeasonStatsForAccordion.mockResolvedValueOnce([{ team_id: '2', division_name: 'Competitive', champion: false, team_name: 'B', match_wins: 1, match_losses: 1, game_wins: 2, game_losses: 2, power_score: 0.2, season_id: 's1', sos: null, runner_up: false, playoff_rank: null, team_logo_url: null, team_image_url: null }]);
    wrap(<SeasonAccordion season={season} />);
    fireEvent.click(await screen.findByText('Full Season Recap'));
    fireEvent.click(await screen.findByText('Edit Divisions'));
    expect(await screen.findByText('edit mode')).toBeInTheDocument();
  });
});

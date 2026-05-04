import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import SeasonAccordion from '../SeasonAccordion';

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));
vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: true }),
}));

const { fetchSeasonStatsForAccordion } = vi.hoisted(() => ({
  fetchSeasonStatsForAccordion: vi.fn(),
}));
vi.mock('@/services/SeasonService', () => ({
  SeasonService: { fetchSeasonStatsForAccordion },
}));
vi.mock('../SeasonMetaBar', () => ({ default: () => <div>meta bar</div> }));
vi.mock('../DivisionPanel', () => ({
  default: ({ divisionName }: { divisionName: string }) => <div>{divisionName}</div>,
}));

// Capture EditModeContainer props so the test can invoke onSave directly.
const editModeProps: { onSave?: () => void | Promise<void>; isSaving?: boolean }[] = [];
vi.mock('../editing/EditModeContainer', () => ({
  default: (props: { onSave: () => void | Promise<void>; isSaving?: boolean }) => {
    editModeProps.push(props);
    return (
      <div>
        <span>edit mode</span>
        <span data-testid="is-saving">{props.isSaving ? 'saving' : 'idle'}</span>
        <button onClick={() => props.onSave()}>trigger-save</button>
      </div>
    );
  },
}));

const season = {
  id: 's1',
  name: 'Spring',
  start_date: '2025-01-01',
  end_date: '2025-03-01',
  is_active: false,
};

const sampleData = [
  {
    team_id: '1',
    division_name: 'Competitive',
    champion: false,
    team_name: 'A',
    match_wins: 1,
    match_losses: 0,
    game_wins: 2,
    game_losses: 1,
    power_score: 0.5,
    season_id: 's1',
    sos: null,
    runner_up: false,
    playoff_rank: null,
    team_logo_url: null,
    team_image_url: null,
  },
];

const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>
  );

describe('SeasonAccordionExpandedContent onSave integration', () => {
  it('refetches season data and exits edit mode when onSave resolves', async () => {
    editModeProps.length = 0;
    fetchSeasonStatsForAccordion.mockResolvedValue(sampleData);

    wrap(<SeasonAccordion season={season} />);

    // Initial query fires once on mount (enabled: true).
    await waitFor(() => expect(fetchSeasonStatsForAccordion).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByText('Full Season Recap'));
    fireEvent.click(await screen.findByText('Edit Divisions'));
    expect(await screen.findByText('edit mode')).toBeInTheDocument();

    fireEvent.click(screen.getByText('trigger-save'));

    // refetch() triggers another call to the underlying service.
    await waitFor(() => expect(fetchSeasonStatsForAccordion).toHaveBeenCalledTimes(2));

    // Edit mode exits after save resolves.
    await waitFor(() => expect(screen.queryByText('edit mode')).not.toBeInTheDocument());
  });

  it('keeps user in edit mode and surfaces saving=false when refetch fails', async () => {
    editModeProps.length = 0;
    fetchSeasonStatsForAccordion.mockResolvedValueOnce(sampleData);

    wrap(<SeasonAccordion season={season} />);
    await waitFor(() => expect(fetchSeasonStatsForAccordion).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByText('Full Season Recap'));
    fireEvent.click(await screen.findByText('Edit Divisions'));
    await screen.findByText('edit mode');

    // Next refetch rejects.
    fetchSeasonStatsForAccordion.mockRejectedValueOnce(new Error('refetch failed'));

    const latest = editModeProps[editModeProps.length - 1];
    await act(async () => {
      await expect(latest.onSave?.()).rejects.toThrow('refetch failed');
    });

    // Still in edit mode because refetch threw before setIsEditMode(false).
    expect(screen.getByText('edit mode')).toBeInTheDocument();
    // isSaving is reset by the finally block.
    expect(screen.getByTestId('is-saving').textContent).toBe('idle');
  });
});

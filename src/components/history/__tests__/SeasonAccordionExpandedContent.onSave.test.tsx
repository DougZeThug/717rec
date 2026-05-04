import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  beforeEach(() => {
    fetchSeasonStatsForAccordion.mockReset();
    editModeProps.length = 0;
  });

  it('refetches season data and exits edit mode when onSave resolves', async () => {
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

  it('toggles isSaving while onSave is in flight and resets after completion', async () => {
    fetchSeasonStatsForAccordion.mockResolvedValueOnce(sampleData);

    wrap(<SeasonAccordion season={season} />);
    await waitFor(() => expect(fetchSeasonStatsForAccordion).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByText('Full Season Recap'));
    fireEvent.click(await screen.findByText('Edit Divisions'));
    await screen.findByText('edit mode');

    // Defer the refetch promise so we can observe isSaving=true mid-flight.
    let resolveRefetch: (value: typeof sampleData) => void = () => {};
    fetchSeasonStatsForAccordion.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefetch = resolve;
        })
    );

    const latest = editModeProps[editModeProps.length - 1];
    let savePromise: Promise<unknown> | undefined;
    act(() => {
      savePromise = Promise.resolve(latest.onSave?.());
    });

    // Mid-flight: refetch is pending, isSaving should be true on the next render.
    await waitFor(() =>
      expect(editModeProps[editModeProps.length - 1].isSaving).toBe(true)
    );

    await act(async () => {
      resolveRefetch(sampleData);
      await savePromise;
    });

    // Edit mode exits and saving resets.
    await waitFor(() => expect(screen.queryByText('edit mode')).not.toBeInTheDocument());
  });
});

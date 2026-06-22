import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseSeasonParticipations = vi.fn();
let seasons: Array<{ id: string; name: string; is_active: boolean }> | undefined;

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => ({ data: seasons, isLoading: false }),
}));

vi.mock('@/hooks/useTeams', () => ({
  useTeams: () => ({ teams: [], isLoading: false }),
}));

vi.mock('@/hooks/useSeasonParticipation', () => ({
  useSeasonParticipations: (seasonId?: string) => mockUseSeasonParticipations(seasonId),
}));

import SeasonParticipationTab from '../SeasonParticipationTab';

describe('SeasonParticipationTab', () => {
  beforeEach(() => {
    seasons = undefined;
    mockUseSeasonParticipations.mockReturnValue({ data: [], isLoading: false });
  });

  it('uses the active season as the selected season as soon as seasons load', () => {
    const { unmount } = render(
      <MemoryRouter>
        <SeasonParticipationTab />
      </MemoryRouter>
    );

    expect(mockUseSeasonParticipations.mock.lastCall).toHaveLength(1);
    expect(mockUseSeasonParticipations.mock.lastCall?.[0]).toBeUndefined();

    seasons = [
      { id: 'season-old', name: 'Old Season', is_active: false },
      { id: 'season-active', name: 'Active Season', is_active: true },
    ];
    unmount();
    render(
      <MemoryRouter>
        <SeasonParticipationTab />
      </MemoryRouter>
    );

    expect(mockUseSeasonParticipations).toHaveBeenLastCalledWith('season-active');
    expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('Active Season (Active)');
  });
});

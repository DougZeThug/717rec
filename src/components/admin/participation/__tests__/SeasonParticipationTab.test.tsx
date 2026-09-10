import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseSeasonParticipations = vi.fn();
let seasons: Array<{ id: string; name: string; is_active: boolean }> | undefined;

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => ({ data: seasons, isLoading: false }),
}));

let teams: Array<{ id: string; name: string; divisionName?: string | null }> = [];

vi.mock('@/hooks/useTeams', () => ({
  useTeams: () => ({ teams, isLoading: false }),
}));

let mockIsMobile = false;
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockIsMobile }));

vi.mock('@/hooks/useSeasonParticipation', () => ({
  useSeasonParticipations: (seasonId?: string) => mockUseSeasonParticipations(seasonId),
}));

import SeasonParticipationTab from '../SeasonParticipationTab';

describe('SeasonParticipationTab', () => {
  beforeAll(() => {
    // Radix Select needs these; jsdom has none of them.
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    seasons = undefined;
    teams = [];
    mockIsMobile = false;
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

  describe('the participation table', () => {
    const renderWithTeams = () => {
      seasons = [{ id: 'season-active', name: 'Active Season', is_active: true }];
      teams = [
        { id: 'team-1', name: 'Ringers', divisionName: 'Competitive' },
        { id: 'team-2', name: 'Cornstars', divisionName: 'Intermediate' },
        { id: 'team-3', name: 'Baggin Rights', divisionName: null },
      ];
      mockUseSeasonParticipations.mockReturnValue({
        data: [
          {
            team_id: 'team-1',
            status: 'PLAYING',
            updated_at: '2026-09-04T19:02:00.000Z',
            submitted_by_name: 'Casey',
          },
          { team_id: 'team-2', status: 'NOT_PLAYING', updated_at: null, submitted_by_name: null },
        ],
        isLoading: false,
      });

      return render(
        <MemoryRouter>
          <SeasonParticipationTab />
        </MemoryRouter>
      );
    };

    it('gives every column a scoped heading', () => {
      renderWithTeams();

      const headers = screen.getAllByRole('columnheader');
      expect(headers.map((h) => h.textContent)).toEqual([
        'Team Name',
        'Division',
        'Status',
        'Updated',
        'Submitted By',
      ]);
      for (const header of headers) {
        expect(header).toHaveAttribute('scope', 'col');
      }
    });

    it('names each status in words, not just by colour', () => {
      renderWithTeams();

      // 'Playing' also labels a summary tile above, so scope to the table.
      const table = within(screen.getByRole('table'));
      expect(table.getByText('Playing')).toBeInTheDocument();
      expect(table.getByText('Not Playing')).toBeInTheDocument();
      // A team with no participation row has not answered yet.
      expect(table.getByText('No Response')).toBeInTheDocument();
    });

    it('falls back to a dash where a team has no division or no answer', () => {
      renderWithTeams();
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('becomes a labelled list of cards on a phone, not a table', () => {
      mockIsMobile = true;
      renderWithTeams();

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      const list = screen.getByRole('list', { name: 'Season participation by team' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(teams.length);

      // The column heading is reused verbatim as the card's label.
      const firstCard = within(list).getAllByRole('listitem')[0];
      expect(within(firstCard).getByText('Submitted By')).toBeInTheDocument();
    });

    it('shows the empty state when a filter matches no team', async () => {
      const user = userEvent.setup();
      renderWithTeams();

      await user.click(screen.getByRole('combobox', { name: 'Filter by status' }));
      await user.click(await screen.findByRole('option', { name: 'No Response' }));

      expect(screen.getByText('Baggin Rights')).toBeInTheDocument();
      expect(screen.queryByText('Ringers')).not.toBeInTheDocument();
    });
  });
});

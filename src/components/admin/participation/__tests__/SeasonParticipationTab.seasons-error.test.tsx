import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseSeasons = vi.fn();
const mockUseSeasonParticipations = vi.fn();

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => mockUseSeasons(),
}));

vi.mock('@/hooks/useTeams', () => ({
  useTeams: () => ({ teams: [{ id: 't1', name: 'Alpha' }], isLoading: false }),
}));

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));

vi.mock('@/hooks/useSeasonParticipation', () => ({
  useSeasonParticipations: (seasonId?: string) => mockUseSeasonParticipations(seasonId),
}));

import SeasonParticipationTab from '../SeasonParticipationTab';

const renderTab = () =>
  render(
    <MemoryRouter>
      <SeasonParticipationTab />
    </MemoryRouter>
  );

describe('SeasonParticipationTab when seasons do not load', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    // Participation lookup is disabled with no season, so it returns empty data.
    mockUseSeasonParticipations.mockReturnValue({ data: [], isLoading: false });
  });

  it('shows an error with a retry button, not fake "No Response" rows, when seasons fail', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockUseSeasons.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    renderTab();

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load seasons');
    expect(screen.queryByText('No Response')).not.toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('says there are no seasons, with no team table, when the list is empty', () => {
    mockUseSeasons.mockReturnValue({ data: [], isLoading: false, isError: false });

    renderTab();

    expect(screen.getByText('No seasons yet')).toBeInTheDocument();
    expect(screen.queryByText('No Response')).not.toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });
});

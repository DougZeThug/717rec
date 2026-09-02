import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseConfirmationSeason = vi.hoisted(() => vi.fn());
const mockUseTeamMembership = vi.hoisted(() => vi.fn());
const mockUseTeamParticipation = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useSeasonParticipation', () => ({
  useConfirmationSeason: () => mockUseConfirmationSeason(),
  useTeamParticipation: (...args: unknown[]) => mockUseTeamParticipation(...args),
  useSubmitParticipation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => mockUseTeamMembership(),
}));

vi.mock('../HeroCardBase', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import ParticipationHeroCard from '../ParticipationHeroCard';

const season = { id: 's-1', name: 'Fall 2026' };
const ownTeam = { id: 't-1', name: 'Wolves' };

const membership = (overrides: Record<string, unknown> = {}) => ({
  membership: { id: 'm-1', team_id: 't-1', is_approved: true, team: ownTeam, ...overrides },
  isFetching: false,
});

describe('ParticipationHeroCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfirmationSeason.mockReturnValue({ data: season, isLoading: false });
    mockUseTeamParticipation.mockReturnValue({ data: null, isLoading: false });
  });

  it('answers for the signed-in member’s own team, with nothing to choose', () => {
    mockUseTeamMembership.mockReturnValue(membership());

    render(<ParticipationHeroCard />);

    expect(screen.getByText('Confirm your team for Fall 2026')).toBeInTheDocument();
    expect(screen.getByText('Wolves')).toBeInTheDocument();
    // The team picker is gone: a person can only answer for their own team.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(mockUseTeamParticipation).toHaveBeenCalledWith('s-1', 't-1');
  });

  it('draws nothing for a signed-out visitor', () => {
    mockUseTeamMembership.mockReturnValue({ membership: null, isFetching: false });

    const { container } = render(<ParticipationHeroCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it('draws nothing for a member whose request is not approved yet', () => {
    mockUseTeamMembership.mockReturnValue(membership({ is_approved: false }));

    const { container } = render(<ParticipationHeroCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it('draws nothing while the membership is still loading', () => {
    mockUseTeamMembership.mockReturnValue({ membership: null, isFetching: true });

    const { container } = render(<ParticipationHeroCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it('draws nothing when no season is open for confirmation', () => {
    mockUseConfirmationSeason.mockReturnValue({ data: null, isLoading: false });
    mockUseTeamMembership.mockReturnValue(membership());

    const { container } = render(<ParticipationHeroCard />);

    expect(container).toBeEmptyDOMElement();
  });
});

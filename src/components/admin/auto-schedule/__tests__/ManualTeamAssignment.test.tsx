import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseTeamsQuery = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/teams', () => ({ useTeamsQuery: () => mockUseTeamsQuery() }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import ManualTeamAssignment from '../ManualTeamAssignment';

const teams = [
  { id: '1', name: 'Alpha', imageUrl: null },
  { id: '2', name: 'Bravo', imageUrl: null },
];

const renderPanel = () =>
  render(<ManualTeamAssignment selectedDate={new Date('2026-09-17')} onTeamsAssigned={vi.fn()} />);

describe('ManualTeamAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamsQuery.mockReturnValue({
      data: teams,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('offers the assignment panel once the teams arrive', () => {
    renderPanel();

    expect(screen.getByText('Manually Assign Teams')).toBeInTheDocument();
    // The team checkboxes appear only after a time block is picked.
    expect(screen.getByRole('button', { name: /assign teams/i })).toBeInTheDocument();
  });

  /**
   * A failed fetch leaves `isLoading` false with no data, so an
   * `isLoading`-only guard fell through to an empty checkbox list with an
   * Assign button above it, and nothing said the team list had failed.
   */
  it('says so when the teams cannot be loaded, and offers a retry', async () => {
    const refetch = vi.fn();
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network down'),
      refetch,
    });
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't load the teams. Please try again."
    );
    expect(screen.queryByText('Manually Assign Teams')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /assign teams/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('keeps the panel when a refetch fails but the teams are already loaded', () => {
    mockUseTeamsQuery.mockReturnValue({
      data: teams,
      isLoading: false,
      error: new Error('refetch failed'),
      refetch: vi.fn(),
    });
    renderPanel();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Manually Assign Teams')).toBeInTheDocument();
  });

  it('shows the spinner, not the error, while the first fetch is running', () => {
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    renderPanel();

    expect(screen.getByText(/loading teams/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

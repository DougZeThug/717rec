import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseTeamsQuery = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/teams', () => ({ useTeamsQuery: () => mockUseTeamsQuery() }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));

import { openRadixTrigger } from '@/test/radix';

import ManualTeamAssignment from '../ManualTeamAssignment';

const teams = [
  { id: '1', name: 'Alpha', imageUrl: null },
  { id: '2', name: 'Bravo', imageUrl: null },
];

const renderPanel = ({
  date,
  onTeamsAssigned,
}: { date?: Date | null; onTeamsAssigned?: () => void } = {}) =>
  render(
    <ManualTeamAssignment
      selectedDate={date === undefined ? new Date('2026-09-17') : date}
      onTeamsAssigned={onTeamsAssigned ?? vi.fn()}
    />
  );

/** The checkboxes appear only once a block is chosen, so every flow starts here. */
const chooseFirstBlock = async (user: ReturnType<typeof userEvent.setup>) => {
  await openRadixTrigger(screen.getByRole('combobox'));
  await user.click(await screen.findByRole('option', { name: /SuperUltraEarly Block/ }));
};

describe('ManualTeamAssignment', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

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

  // `handleTeamToggle` removes an id it already holds. Only the adding half ran
  // in any test, so unchecking a team was never exercised.
  it('takes a team back off the list when it is unchecked again', async () => {
    const user = userEvent.setup();
    renderPanel();
    await chooseFirstBlock(user);

    const alpha = screen.getByRole('checkbox', { name: 'Alpha' });
    await user.click(alpha);
    expect(alpha).toBeChecked();
    expect(screen.getByText('1 teams selected')).toBeInTheDocument();

    await user.click(alpha);
    expect(alpha).not.toBeChecked();
    expect(screen.getByText('0 teams selected')).toBeInTheDocument();
  });

  // The Assign button only needs a block and a team to become pressable, so it
  // can be pressed with no night chosen. The guard says which one is missing
  // rather than assigning to nothing.
  it('asks for a date instead of assigning, when no night is chosen', async () => {
    const onTeamsAssigned = vi.fn();
    const user = userEvent.setup();
    renderPanel({ date: null, onTeamsAssigned });
    await chooseFirstBlock(user);

    await user.click(screen.getByRole('checkbox', { name: 'Alpha' }));
    await user.click(screen.getByRole('button', { name: /assign teams/i }));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Date Required', variant: 'destructive' })
    );
    expect(onTeamsAssigned).not.toHaveBeenCalled();
  });
});

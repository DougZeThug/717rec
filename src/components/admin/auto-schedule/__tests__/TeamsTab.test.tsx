import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import TeamsTab from '../tabs/TeamsTab';

vi.mock('@/components/admin/batch-matches/auto-schedule/SchedulePreview', () => ({
  default: () => <div data-testid="schedule-preview">Schedule Preview</div>,
}));

vi.mock('@/components/admin/batch-matches/auto-schedule/InteractiveSchedulePreview', () => ({
  default: () => <div data-testid="interactive-preview">Interactive Preview</div>,
}));

vi.mock('@/components/admin/auto-schedule/ManualTeamAssignment', () => ({
  default: ({
    onTeamsAssigned,
  }: {
    onTeamsAssigned: (teams: Record<string, unknown[]>) => void;
  }) => (
    <button onClick={() => onTeamsAssigned({ Late: [{ id: 'team-c', name: 'Team C' }] })}>
      Add Team C
    </button>
  ),
}));

type WarningDisplayProps = {
  oddBlocks?: number;
  unmatchedTeams?: number;
  insufficientBlocks?: string[];
  dualMatchMode?: boolean;
};

vi.mock('@/components/admin/batch-matches/auto-schedule/WarningDisplay', () => ({
  WarningDisplay: ({
    oddBlocks,
    unmatchedTeams,
    insufficientBlocks = [],
    dualMatchMode,
  }: WarningDisplayProps) => (
    <div data-testid="warning-display">
      odd:{oddBlocks}|unmatched:{unmatchedTeams}|insufficient:{insufficientBlocks.length}|dual:
      {String(dualMatchMode)}
    </div>
  ),
}));

vi.mock('@/utils/autoSchedule/edgeCaseUtils', () => ({
  validateTeamCounts: vi.fn(),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

import { validateTeamCounts } from '@/utils/autoSchedule/edgeCaseUtils';

describe('TeamsTab', () => {
  const baseProps = {
    selectedDate: new Date('2026-04-28T12:00:00Z'),
    unmatchedTeamIds: ['u1'],
    oddBlocks: 1,
    totalTeams: 2,
    onManualTeamAssign: vi.fn(),
    timeBlockTeams: {
      Early: [
        { id: 'team-a', name: 'Team A' },
        { id: 'team-b', name: 'Team B' },
      ],
    },
    originalTimeBlockTeams: {
      Early: [{ id: 'team-a', name: 'Team A' }],
    },
  };

  it.each([
    { insufficientBlocks: [], shouldShowWarning: true, label: 'odd block warning only' },
    {
      insufficientBlocks: ['Early'],
      shouldShowWarning: true,
      label: 'insufficient teams warning',
    },
  ])('renders validation warnings for $label', ({ insufficientBlocks, shouldShowWarning }) => {
    vi.mocked(validateTeamCounts).mockReturnValue({
      isValid: insufficientBlocks.length === 0,
      insufficientBlocks,
      hasOddBlocks: false,
      oddBlocks: [],
      totalTeams: 2,
    });

    render(<TeamsTab {...baseProps} />);

    if (shouldShowWarning) {
      expect(screen.getByTestId('warning-display')).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId('warning-display')).toBeNull();
    }
  });

  it.each([
    { label: 'on', props: { dualMatchMode: true }, expected: 'dual:true' },
    { label: 'off', props: { dualMatchMode: false }, expected: 'dual:false' },
    { label: 'not given', props: {}, expected: 'dual:undefined' },
  ])('hands Dual Match Mode ($label) to the odd-block alert', ({ props, expected }) => {
    vi.mocked(validateTeamCounts).mockReturnValue({
      isValid: true,
      insufficientBlocks: [],
      hasOddBlocks: true,
      oddBlocks: ['Early'],
      totalTeams: 3,
    });

    render(<TeamsTab {...baseProps} {...props} />);

    expect(screen.getByTestId('warning-display')).toHaveTextContent(expected);
  });

  it('switches between preview and edit rendering modes', async () => {
    vi.mocked(validateTeamCounts).mockReturnValue({
      isValid: true,
      insufficientBlocks: [],
      hasOddBlocks: false,
      oddBlocks: [],
      totalTeams: 2,
    });
    const user = userEvent.setup();

    render(<TeamsTab {...baseProps} oddBlocks={0} />);

    expect(screen.getByTestId('schedule-preview')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit Teams' }));
    expect(screen.getByTestId('interactive-preview')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View Mode' }));
    expect(screen.getByTestId('schedule-preview')).toBeInTheDocument();
  });

  it('merges manual assignments and returns to auto-loaded tab', async () => {
    vi.mocked(validateTeamCounts).mockReturnValue({
      isValid: true,
      insufficientBlocks: [],
      hasOddBlocks: false,
      oddBlocks: [],
      totalTeams: 2,
    });
    const user = userEvent.setup();
    const onManualTeamAssign = vi.fn();

    render(<TeamsTab {...baseProps} oddBlocks={0} onManualTeamAssign={onManualTeamAssign} />);

    await user.click(screen.getByRole('tab', { name: 'Manual Assignment' }));
    await user.click(screen.getByRole('button', { name: 'Add Team C' }));

    expect(onManualTeamAssign).toHaveBeenCalledWith({
      Early: [
        { id: 'team-a', name: 'Team A' },
        { id: 'team-b', name: 'Team B' },
      ],
      Late: [{ id: 'team-c', name: 'Team C' }],
    });
    expect(screen.getByTestId('schedule-preview')).toBeInTheDocument();
  });
});

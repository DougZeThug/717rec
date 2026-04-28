import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import MatchesTab from '../tabs/MatchesTab';

vi.mock('@/components/admin/batch-matches/auto-schedule/ScheduleMatchesPreview', () => ({
  default: () => <div data-testid="matches-preview">Matches Preview</div>,
}));

vi.mock('@/components/admin/auto-schedule/EditableMatchList', () => ({
  default: () => <div data-testid="editable-match-list">Editable Match List</div>,
}));

vi.mock('@/components/admin/auto-schedule/DualMatchWarningDisplay', () => ({
  default: ({ duplicateOpponentsCount }: { duplicateOpponentsCount: number }) => (
    <div data-testid="dual-warning">duplicates:{duplicateOpponentsCount}</div>
  ),
}));

vi.mock('@/utils/autoSchedule/dualBlock', () => ({
  calculateDualBlockMetrics: vi.fn(),
  validateDualBlockSchedule: vi.fn(),
}));

import { calculateDualBlockMetrics, validateDualBlockSchedule } from '@/utils/autoSchedule/dualBlock';

describe('MatchesTab', () => {
  const pairings = {
    Early: [
      {
        team1: { id: 'a', name: 'Team A' },
        team2: { id: 'b', name: 'Team B' },
        compatibilityScore: 8,
      },
    ],
    Late: [
      {
        team1: { id: 'a', name: 'Team A' },
        team2: { id: 'c', name: 'Team C' },
        compatibilityScore: 7,
      },
    ],
  };

  const baseProps = {
    selectedDate: new Date('2026-04-28T12:00:00Z'),
    timeBlockTeams: {
      Early: [
        { id: 'a', name: 'Team A' },
        { id: 'b', name: 'Team B' },
      ],
      Late: [{ id: 'c', name: 'Team C' }],
    },
    generatedPairings: pairings,
    unmatchedTeamIds: [],
    isGenerating: false,
    matchQualityMetrics: { qualityRating: 'Good', averageCompatibilityScore: 7.5, totalMatches: 2, rematchCount: 0 },
    onApplySchedule: vi.fn(),
    onSaveSchedule: vi.fn().mockResolvedValue(true),
    onToggleEditMode: vi.fn(),
    onResetEdits: vi.fn(),
    dualMatchMode: true,
  };

  it.each([
    { isEditMode: false, hasUnsavedEdits: false, expectedPanel: 'matches-preview' },
    { isEditMode: true, hasUnsavedEdits: true, expectedPanel: 'editable-match-list' },
  ])('renders correct assignment/preview path for state %#', (state) => {
    vi.mocked(calculateDualBlockMetrics).mockReturnValue({
      overallQualityScore: 78,
      teamsWithBothMatches: 3,
      teamsWithSingleMatch: 0,
      crossBlockCompatibility: 8.1,
      teamsWithDuplicateOpponents: 1,
    } as any);
    vi.mocked(validateDualBlockSchedule).mockReturnValue({ teamsWithDuplicateOpponents: ['a'] } as any);

    render(<MatchesTab {...baseProps} {...state} />);

    expect(screen.getByTestId(state.expectedPanel)).toBeInTheDocument();
    expect(screen.getByTestId('dual-warning')).toHaveTextContent('duplicates:1');
  });

  it('handles edit-mode actions and validation-driven save button disabling', async () => {
    vi.mocked(calculateDualBlockMetrics).mockReturnValue({
      overallQualityScore: 88,
      teamsWithBothMatches: 3,
      teamsWithSingleMatch: 0,
      crossBlockCompatibility: 8.4,
      teamsWithDuplicateOpponents: 0,
    } as any);
    vi.mocked(validateDualBlockSchedule).mockReturnValue({ teamsWithDuplicateOpponents: [] } as any);

    const user = userEvent.setup();
    const onToggleEditMode = vi.fn();
    const onResetEdits = vi.fn();

    render(
      <MatchesTab
        {...baseProps}
        isEditMode={true}
        hasUnsavedEdits={true}
        onToggleEditMode={onToggleEditMode}
        onResetEdits={onResetEdits}
        validation={{ isValid: false, errors: [], warnings: [] }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Preview Mode' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onToggleEditMode).toHaveBeenCalledTimes(1);
    expect(onResetEdits).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Save Matches' })).toBeDisabled();
  });
});

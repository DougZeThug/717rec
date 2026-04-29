import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type {
  DualBlockValidationResult,
  DualMatchMetrics,
} from '@/utils/autoSchedule/dualBlock/types';

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
        hasPlayedBefore: false,
      },
    ],
    Late: [
      {
        team1: { id: 'a', name: 'Team A' },
        team2: { id: 'c', name: 'Team C' },
        compatibilityScore: 7,
        hasPlayedBefore: false,
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
    matchQualityMetrics: {
      qualityRating: 'Good' as const,
      averageCompatibilityScore: 7.5,
      totalMatches: 2,
      rematchCount: 0,
      opponentDiversity: { duplicateOpponents: 0, uniqueOpponents: 2, diversityScore: 100 },
      powerScoreAnalysis: {
        averagePowerScoreDifference: 0,
        balancedMatches: 2,
        unbalancedMatches: 0,
      },
      performanceMetrics: {
        generationTimeMs: 0,
        algorithmsUsed: [],
        optimizationLevel: 'standard' as const,
      },
      feedback: { strengths: [], improvements: [], recommendations: [] },
    },
    onApplySchedule: vi.fn(),
    onSaveSchedule: vi.fn().mockResolvedValue(true),
    onToggleEditMode: vi.fn(),
    onResetEdits: vi.fn(),
    dualMatchMode: true,
  };

  const duplicateMetrics: DualMatchMetrics = {
    overallQualityScore: 78,
    teamsWithBothMatches: 3,
    teamsWithSingleMatch: 0,
    crossBlockCompatibility: 8.1,
    teamsWithDuplicateOpponents: 1,
    averageCompatibilityScore: 7.5,
    blockBalanceScore: 100,
  };

  const cleanMetrics: DualMatchMetrics = {
    overallQualityScore: 88,
    teamsWithBothMatches: 3,
    teamsWithSingleMatch: 0,
    crossBlockCompatibility: 8.4,
    teamsWithDuplicateOpponents: 0,
    averageCompatibilityScore: 7.8,
    blockBalanceScore: 100,
  };

  it.each([
    { isEditMode: false, hasUnsavedEdits: false, expectedPanel: 'matches-preview' },
    { isEditMode: true, hasUnsavedEdits: true, expectedPanel: 'editable-match-list' },
  ])('renders correct assignment/preview path for state %#', (state) => {
    const duplicateValidation: DualBlockValidationResult = {
      isValid: false,
      teamsWithDuplicateOpponents: ['a'],
      overbookedTeams: [],
      warnings: [],
      errors: [],
    };

    vi.mocked(calculateDualBlockMetrics).mockReturnValue(duplicateMetrics);
    vi.mocked(validateDualBlockSchedule).mockReturnValue(duplicateValidation);

    render(<MatchesTab {...baseProps} {...state} />);

    expect(screen.getByTestId(state.expectedPanel)).toBeInTheDocument();
    expect(screen.getByTestId('dual-warning')).toHaveTextContent('duplicates:1');
  });

  it('handles edit-mode actions and validation-driven save button disabling', async () => {
    const cleanValidation: DualBlockValidationResult = {
      isValid: true,
      teamsWithDuplicateOpponents: [],
      overbookedTeams: [],
      warnings: [],
      errors: [],
    };

    vi.mocked(calculateDualBlockMetrics).mockReturnValue(cleanMetrics);
    vi.mocked(validateDualBlockSchedule).mockReturnValue(cleanValidation);

    const user = userEvent.setup();
    const onToggleEditMode = vi.fn();
    const onResetEdits = vi.fn();

    render(
      <MatchesTab
        {...baseProps}
        isEditMode
        hasUnsavedEdits
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

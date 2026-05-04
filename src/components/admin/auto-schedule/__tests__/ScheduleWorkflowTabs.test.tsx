import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import ScheduleWorkflowTabs from '../ScheduleWorkflowTabs';

vi.mock('@/components/admin/auto-schedule/tabs/TeamsTab', () => ({
  default: () => <div data-testid="teams-tab-panel">Teams Panel</div>,
}));

vi.mock('@/components/admin/auto-schedule/tabs/MatchesTab', () => ({
  default: () => <div data-testid="matches-tab-panel">Matches Panel</div>,
}));

vi.mock('@/components/admin/auto-schedule/tabs/ExportTab', () => ({
  default: () => <div data-testid="export-tab-panel">Export Panel</div>,
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({
    isWinterTheme: false,
    isDark: true,
    shouldApplyWinterBase: false,
    winterClass: '',
  }),
}));

describe('ScheduleWorkflowTabs', () => {
  const baseProps = {
    setActiveTab: vi.fn(),
    selectedDate: new Date('2026-04-28T12:00:00Z'),
    timeBlockTeams: {},
    originalTimeBlockTeams: {},
    generatedPairings: {},
    generatedMatches: null,
    unmatchedTeamIds: [],
    isGenerating: false,
    oddBlocks: 0,
    totalTeams: 0,
    matchQualityMetrics: null,
    onApplySchedule: vi.fn(),
  };

  it.each([
    { activeTab: 'teams', testId: 'teams-tab-panel' },
    { activeTab: 'pairings', testId: 'matches-tab-panel' },
    { activeTab: 'export', testId: 'export-tab-panel' },
  ])('renders $activeTab content panel', ({ activeTab, testId }) => {
    render(<ScheduleWorkflowTabs {...baseProps} activeTab={activeTab} />);

    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('triggers active tab updates when users navigate workflow steps', async () => {
    const user = userEvent.setup();
    const setActiveTab = vi.fn();

    const { rerender } = render(
      <ScheduleWorkflowTabs {...baseProps} activeTab="teams" setActiveTab={setActiveTab} />
    );

    await user.click(screen.getByRole('tab', { name: '2. Matches' }));

    rerender(
      <ScheduleWorkflowTabs {...baseProps} activeTab="pairings" setActiveTab={setActiveTab} />
    );
    await user.click(screen.getByRole('tab', { name: '3. Export' }));

    expect(setActiveTab).toHaveBeenCalledWith('pairings');
    expect(setActiveTab).toHaveBeenCalledWith('export');
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ExportTab from '@/components/admin/auto-schedule/tabs/ExportTab';
import type { MatchQualityMetrics } from '@/types/autoSchedule';
import type { ScheduledMatch } from '@/types/schedule';
import { subscribeToAdminTabRequests } from '@/utils/adminTabs';

const matches = [
  { team1Id: 't-1', team2Id: 't-2', timeSlot: '7:00 PM' },
  { team1Id: 't-3', team2Id: 't-4', timeSlot: '7:30 PM' },
] as unknown as ScheduledMatch[];

const renderTab = (props: Partial<React.ComponentProps<typeof ExportTab>> = {}) =>
  render(<ExportTab selectedDate={new Date('2026-07-01')} generatedMatches={matches} {...props} />);

describe('ExportTab', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('asks the admin to generate a schedule before there is one to export', () => {
    renderTab({ generatedMatches: null });

    expect(screen.getByText('Export the generated schedule first')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save schedule/i })).not.toBeInTheDocument();
  });

  it('says the same when a schedule was generated but is empty', () => {
    renderTab({ generatedMatches: [] });

    expect(screen.getByText('Export the generated schedule first')).toBeInTheDocument();
  });

  it('counts the matches waiting to be saved', () => {
    renderTab();

    expect(screen.getByText('2 matches have been created')).toBeInTheDocument();
  });

  it('saves the schedule when asked', async () => {
    const onSaveSchedule = vi.fn().mockResolvedValue(true);
    renderTab({ onSaveSchedule });

    await userEvent.click(screen.getByRole('button', { name: /save schedule to database/i }));

    expect(onSaveSchedule).toHaveBeenCalledTimes(1);
  });

  it('shows the save is in progress and refuses a second press', () => {
    renderTab({ isSaving: true });

    expect(screen.getByText('Saving to Database...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saving to database/i })).toBeDisabled();
  });

  it('warns about unsaved edits only when there are some', () => {
    renderTab();
    expect(screen.queryByText(/unsaved edits/i)).not.toBeInTheDocument();

    document.body.innerHTML = '';
    renderTab({ hasUnsavedEdits: true });
    expect(screen.getByText(/You have unsaved edits to the schedule/i)).toBeInTheDocument();
  });

  it('opens the Batch Matches section rather than setting a dead URL fragment', async () => {
    const onRequest = vi.fn();
    const unsubscribe = subscribeToAdminTabRequests(onRequest);
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: /go to batch matches/i }));

    expect(onRequest).toHaveBeenCalledWith('batch-matches');
    unsubscribe();
  });

  it('reports the quality of the generated schedule', () => {
    const matchQualityMetrics = {
      qualityRating: 'Excellent',
      averageCompatibilityScore: 8.25,
      totalMatches: 2,
      rematchCount: 0,
    } as unknown as MatchQualityMetrics;
    renderTab({ matchQualityMetrics });

    expect(screen.getByText('Schedule Quality Report')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText('8.3/10')).toBeInTheDocument();
  });

  it('leaves out the quality report when no metrics were produced', () => {
    renderTab({ matchQualityMetrics: null });

    expect(screen.queryByText('Schedule Quality Report')).not.toBeInTheDocument();
  });
});

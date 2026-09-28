import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ScheduleContentSkeleton from '../ScheduleContentSkeleton';

describe('ScheduleContentSkeleton', () => {
  it('shows the same three tabs as the loaded schedule', () => {
    render(<ScheduleContentSkeleton activeTab="timeslots" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Timeslots', 'Upcoming', 'Completed']);
  });

  // useScheduleTabs starts on 'timeslots' for a first visit, and stays there
  // until the data loads. With no matching trigger, no tab was selected.
  it('marks the Timeslots tab as selected while loading on the default tab', () => {
    render(<ScheduleContentSkeleton activeTab="timeslots" />);

    expect(screen.getByRole('tab', { name: 'Timeslots' })).toHaveAttribute('aria-selected', 'true');
  });

  it('marks a saved tab as selected', () => {
    render(<ScheduleContentSkeleton activeTab="completed" />);

    expect(screen.getByRole('tab', { name: 'Completed' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Timeslots' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });
});

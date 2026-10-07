import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FilterBar from '../FilterBar';
import type { FilterState } from '../types';

const filters: FilterState = { date: new Date(2026, 9, 1) };

describe('FilterBar', () => {
  // The hint only shows once a date filter is set. TooltipTrigger asChild passes its handlers to the hint label. If the label
  // drops them, the tooltip can never open.
  it('opens the session-date tooltip when the hint gets focus', async () => {
    render(
      <FilterBar
        filters={filters}
        brackets={[]}
        onDateChange={vi.fn()}
        onBracketChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    );

    const hint = screen.getByText(/Showing matches for the entire session/);
    const trigger = hint.closest('[data-state]');
    expect(trigger).not.toBeNull();

    fireEvent.focus(trigger as HTMLElement);

    expect(
      (await screen.findAllByText(/might be stored with next-day UTC dates/)).length
    ).toBeGreaterThan(0);
  });
});

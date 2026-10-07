import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { openRadixTrigger } from '@/test/radix';

import FilterBar from '../FilterBar';
import type { FilterState } from '../types';

const filters: FilterState = { date: new Date(2026, 9, 1) };

const brackets = [
  { id: 'bracket-a', title: 'Division A Playoffs' },
  { id: 'bracket-b', title: 'Division B Playoffs' },
];

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

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

  it('lists every bracket and reports the one picked', async () => {
    const onBracketChange = vi.fn();
    render(
      <FilterBar
        filters={{}}
        brackets={brackets}
        onDateChange={vi.fn()}
        onBracketChange={onBracketChange}
        onClearFilters={vi.fn()}
      />
    );

    await openRadixTrigger(screen.getByRole('combobox', { name: 'Filter by bracket' }));
    expect(await screen.findByRole('option', { name: 'All Brackets' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Division A Playoffs' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Division B Playoffs' }));

    expect(onBracketChange).toHaveBeenCalledWith('bracket-b');
  });

  it('clears the bracket filter when All Brackets is picked', async () => {
    const onBracketChange = vi.fn();
    render(
      <FilterBar
        filters={{ bracketId: 'bracket-a' }}
        brackets={brackets}
        onDateChange={vi.fn()}
        onBracketChange={onBracketChange}
        onClearFilters={vi.fn()}
      />
    );

    await openRadixTrigger(screen.getByRole('combobox', { name: 'Filter by bracket' }));
    await userEvent.click(await screen.findByRole('option', { name: 'All Brackets' }));

    expect(onBracketChange).toHaveBeenCalledWith(undefined);
  });
});

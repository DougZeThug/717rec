import { render, screen } from '@testing-library/react';
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
  // The hint is plain text once a date filter is set. It had a tooltip about UTC storage whose
  // trigger was a div: no keyboard could reach it and no phone could open it.
  it('shows the session-date hint as plain text when a date is set', () => {
    render(
      <FilterBar
        filters={filters}
        brackets={[]}
        onDateChange={vi.fn()}
        onBracketChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    );

    const hint = screen.getByText(
      'Showing matches for the entire session (including evening games)'
    );
    expect(hint).toBeVisible();
    expect(hint.closest('[data-state]')).toBeNull();
    expect(hint.parentElement?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText(/next-day UTC dates/)).not.toBeInTheDocument();
  });

  it('shows no session-date hint when no date is set', () => {
    render(
      <FilterBar
        filters={{}}
        brackets={[]}
        onDateChange={vi.fn()}
        onBracketChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    );

    expect(screen.queryByText(/Showing matches for the entire session/)).not.toBeInTheDocument();
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

    expect(onBracketChange).toHaveBeenCalledWith(undefined); // skipcq: JS-W1042
  });
});

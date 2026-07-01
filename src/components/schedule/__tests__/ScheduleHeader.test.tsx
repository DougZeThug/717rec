import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ScheduleHeader from '../ScheduleHeader';

describe('ScheduleHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the DateStrip, search input and calendar trigger when onDateSelect is provided', () => {
    render(
      <ScheduleHeader
        searchTerm=""
        setSearchTerm={vi.fn()}
        selectedDate={new Date()}
        onDateSelect={vi.fn()}
      />
    );

    // Search input renders.
    expect(screen.getByRole('textbox', { name: 'Search matches' })).toBeInTheDocument();

    // Calendar popover trigger renders.
    expect(screen.getByRole('button', { name: 'Filter schedule by date' })).toBeInTheDocument();

    // DateStrip renders a horizontal row of day buttons (14 days: -3 .. +10).
    // Every date button is a plain <button> and there are many of them.
    expect(screen.getAllByRole('button').length).toBeGreaterThan(5);
  });

  it('forwards typed input to setSearchTerm', async () => {
    const setSearchTerm = vi.fn();
    render(<ScheduleHeader searchTerm="" setSearchTerm={setSearchTerm} onDateSelect={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Search matches'), 'q');

    expect(setSearchTerm).toHaveBeenCalledWith('q');
  });

  it('opens the calendar popover and fires onDateSelect with a Date when a day is picked', async () => {
    const onDateSelect = vi.fn();
    render(
      <ScheduleHeader
        searchTerm=""
        setSearchTerm={vi.fn()}
        selectedDate={new Date()}
        onDateSelect={onDateSelect}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Filter schedule by date' }));

    // The react-day-picker calendar grid is rendered inside the popover.
    const grid = await screen.findByRole('grid');

    // Pick the first selectable day cell (a button whose label is a day number).
    const dayButton = within(grid)
      .getAllByRole('button')
      .find((btn) => /^\d+$/.test((btn.textContent ?? '').trim()));
    expect(dayButton).toBeDefined();

    await userEvent.click(dayButton as HTMLElement);

    expect(onDateSelect).toHaveBeenCalledTimes(1);
    expect(onDateSelect.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  it('hides the DateStrip and calendar trigger when onDateSelect is omitted', () => {
    render(<ScheduleHeader searchTerm="" setSearchTerm={vi.fn()} />);

    // Only the search input remains; no date strip / calendar buttons.
    expect(screen.getByRole('textbox', { name: 'Search matches' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Filter schedule by date' })
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

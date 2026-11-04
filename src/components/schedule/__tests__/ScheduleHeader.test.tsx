import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ScheduleHeader from '../ScheduleHeader';

const renderHeader = (props: Partial<React.ComponentProps<typeof ScheduleHeader>> = {}) =>
  render(
    <ScheduleHeader
      searchTerm=""
      setSearchTerm={vi.fn()}
      selectedDate={new Date()}
      onDateSelect={vi.fn()}
      {...props}
    />
  );

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

    // Pick the first day cell (a button whose label is a day number) that is not already
    // selected. The header selects today, and clicking the selected day deselects it, so on a
    // month whose first grid cell is today the old "first cell" pick never fired onDateSelect.
    const dayButton = within(grid)
      .getAllByRole('button')
      .find(
        (btn) =>
          /^\d+$/.test((btn.textContent ?? '').trim()) &&
          !/selected/i.test(btn.getAttribute('aria-label') ?? '')
      );
    expect(dayButton).toBeDefined();

    await userEvent.click(dayButton as HTMLElement);

    expect(onDateSelect).toHaveBeenCalledTimes(1);
    expect(onDateSelect.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  describe('calendar pop-up', () => {
    // The first day cell that is a plain day number and is not the selected day.
    const pickableDay = (grid: HTMLElement) =>
      within(grid)
        .getAllByRole('button')
        .find(
          (btn) =>
            /^\d+$/.test((btn.textContent ?? '').trim()) &&
            !/selected/i.test(btn.getAttribute('aria-label') ?? '')
        ) as HTMLElement;

    const openCalendar = async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Filter schedule by date' }));
      return screen.findByRole('grid');
    };

    it('closes after a date is picked, so it does not sit over the chips and the list', async () => {
      renderHeader({ selectedDate: new Date() });
      const grid = await openCalendar();

      await userEvent.click(pickableDay(grid));

      await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument());
    });

    it('closes when the selected day is clicked again, without picking a new date', async () => {
      const onDateSelect = vi.fn();
      renderHeader({ selectedDate: new Date(), onDateSelect });
      const grid = await openCalendar();

      const selectedDay = within(grid)
        .getAllByRole('button')
        .find((btn) => /selected/i.test(btn.getAttribute('aria-label') ?? ''));
      expect(selectedDay).toBeDefined();
      await userEvent.click(selectedDay as HTMLElement);

      await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument());
      expect(onDateSelect).not.toHaveBeenCalled();
    });

    it('still closes on Escape', async () => {
      renderHeader({ selectedDate: new Date() });
      await openCalendar();

      await userEvent.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument());
    });

    it('still closes when something outside it is pressed', async () => {
      renderHeader({ selectedDate: new Date() });
      await openCalendar();

      await userEvent.click(screen.getByRole('textbox', { name: 'Search matches' }));

      await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument());
    });

    it('opens again after it was closed by a pick', async () => {
      renderHeader({ selectedDate: new Date() });
      const grid = await openCalendar();
      await userEvent.click(pickableDay(grid));
      await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument());

      expect(await openCalendar()).toBeInTheDocument();
    });
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
  it('renders the filter chips it is handed', () => {
    renderHeader({ filters: <p>chip row</p> });

    expect(screen.getByText('chip row')).toBeInTheDocument();
  });

  it('is fine with no chips at all', () => {
    renderHeader();

    expect(screen.queryByText('chip row')).not.toBeInTheDocument();
  });
});

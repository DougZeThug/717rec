import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format, isSameDay } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DateStrip from '../DateStrip';

// Radix ScrollArea measures itself via ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };

describe('DateStrip', () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 14 day buttons with today highlighted and the seeded match dot', () => {
    const matchDates = new Set<string>([format(tomorrow, 'yyyy-MM-dd')]);

    render(<DateStrip selectedDate={today} onDateSelect={vi.fn()} matchDates={matchDates} />);

    // The strip is 14 days: today - 3 through today + 10.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(14);

    // Today's day number is unique across the 14-day window; use it to locate
    // today's button, then assert its weekday label is rendered inside it.
    const todayDay = screen.getByText(format(today, 'd'));
    const todayButton = todayDay.closest('button');
    expect(todayButton).not.toBeNull();
    expect(
      within(todayButton as HTMLButtonElement).getByText(format(today, 'EEE'))
    ).toBeInTheDocument();

    // The seeded date (tomorrow) shows an orange match-dot indicator...
    const tomorrowButton = screen.getByText(format(tomorrow, 'd')).closest('button');
    expect(tomorrowButton).not.toBeNull();
    expect((tomorrowButton as HTMLButtonElement).querySelector('.bg-orange-500')).not.toBeNull();

    // ...and today's (non-seeded) button does not.
    expect((todayButton as HTMLButtonElement).querySelector('.bg-orange-500')).toBeNull();
  });

  it('marks the selected day with the selected styling/scale', () => {
    render(<DateStrip selectedDate={today} onDateSelect={vi.fn()} matchDates={new Set()} />);

    const todayButton = screen.getByText(format(today, 'd')).closest('button');
    expect(todayButton).not.toBeNull();
    expect((todayButton as HTMLButtonElement).className).toContain('scale-105');
    expect((todayButton as HTMLButtonElement).className).toContain('bg-primary');
  });

  it('calls onDateSelect with a Date when a non-selected day is clicked', async () => {
    const onDateSelect = vi.fn();
    render(<DateStrip selectedDate={today} onDateSelect={onDateSelect} matchDates={new Set()} />);

    const tomorrowButton = screen.getByText(format(tomorrow, 'd')).closest('button');
    expect(tomorrowButton).not.toBeNull();
    await userEvent.click(tomorrowButton as HTMLButtonElement);

    expect(onDateSelect).toHaveBeenCalledTimes(1);
    const arg = onDateSelect.mock.calls[0][0];
    expect(arg).toBeInstanceOf(Date);
    expect(isSameDay(arg as Date, tomorrow)).toBe(true);
  });
});

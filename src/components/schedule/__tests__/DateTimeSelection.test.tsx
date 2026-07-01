import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Silence timezone logging; the real logger pulls in Sentry which we don't need.
vi.mock('@/utils/logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/logger')>()),
  timezoneLog: vi.fn(),
}));

import DateTimeSelection from '../DateTimeSelection';

const timeSlots = ['6:30 PM', '7:00 PM', '7:30 PM'];

const makeProps = (overrides: Partial<React.ComponentProps<typeof DateTimeSelection>> = {}) => ({
  selectedDate: new Date(2026, 6, 1),
  setSelectedDate: vi.fn(),
  selectedTimeSlot: '' as string | null,
  setSelectedTimeSlot: vi.fn(),
  timeSlots,
  ...overrides,
});

describe('DateTimeSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the "please select a time slot" warning when none is selected', () => {
    render(<DateTimeSelection {...makeProps({ selectedTimeSlot: '' })} />);
    expect(screen.getByText('Please select a time slot')).toBeInTheDocument();
  });

  it('renders a button for every provided time slot', () => {
    render(<DateTimeSelection {...makeProps()} />);
    timeSlots.forEach((slot) => {
      expect(screen.getByRole('button', { name: slot })).toBeInTheDocument();
    });
  });

  it('calls setSelectedTimeSlot with the clicked slot value', () => {
    const setSelectedTimeSlot = vi.fn();
    render(<DateTimeSelection {...makeProps({ setSelectedTimeSlot })} />);

    fireEvent.click(screen.getByRole('button', { name: '7:00 PM' }));

    expect(setSelectedTimeSlot).toHaveBeenCalledWith('7:00 PM');
  });

  it('calls setSelectedDate with a parsed Date when the date input changes', () => {
    const setSelectedDate = vi.fn();
    render(<DateTimeSelection {...makeProps({ setSelectedDate })} />);

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-07-15' } });

    expect(setSelectedDate).toHaveBeenCalledTimes(1);
    const arg = setSelectedDate.mock.calls[0][0] as Date;
    expect(arg).toBeInstanceOf(Date);
    expect(arg.getFullYear()).toBe(2026);
    expect(arg.getMonth()).toBe(6); // July (0-indexed)
    expect(arg.getDate()).toBe(15);
  });

  it('hides the warning once a time slot is selected', () => {
    const { rerender } = render(<DateTimeSelection {...makeProps({ selectedTimeSlot: '' })} />);
    expect(screen.getByText('Please select a time slot')).toBeInTheDocument();

    rerender(<DateTimeSelection {...makeProps({ selectedTimeSlot: '7:00 PM' })} />);
    expect(screen.queryByText('Please select a time slot')).not.toBeInTheDocument();
  });
});

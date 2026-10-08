import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThursdayDatePicker } from '../ThursdayDatePicker';

// The calendar opens on the current month, so use that month's first Thursday.
const firstThursdayOfThisMonth = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
  first.setDate(1 + ((4 - first.getDay() + 7) % 7));
  return first;
};
const THURSDAY = firstThursdayOfThisMonth();

/** Calendar day buttons carry a long label such as "Thursday, October 8th, 2026". */
const dayButtons = () =>
  screen.getAllByRole('button', { name: /^(Today, )?(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,/ });

describe('ThursdayDatePicker', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('asks for a Thursday when no date is chosen', () => {
    render(<ThursdayDatePicker selected={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /pick a thursday/i })).toBeInTheDocument();
  });

  it('shows the chosen date on the button', () => {
    render(<ThursdayDatePicker selected={THURSDAY} onSelect={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: new RegExp(`${THURSDAY.getFullYear()}`) })
    ).toBeInTheDocument();
    expect(screen.queryByText('Pick a Thursday')).not.toBeInTheDocument();
  });

  it('opens the calendar and returns the picked Thursday at noon', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ThursdayDatePicker selected={null} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /pick a thursday/i }));
    const thursday = (await screen.findAllByRole('button', { name: /^Thursday,/ })).find(
      (day) => !(day as HTMLButtonElement).disabled
    );
    expect(thursday).toBeDefined();
    await user.click(thursday as HTMLElement);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const picked = onSelect.mock.calls[0][0] as Date;
    expect(picked.getDay()).toBe(4);
    expect(picked.getHours()).toBe(12);
  });

  it('does not let the admin pick a day that is not a Thursday', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ThursdayDatePicker selected={null} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /pick a thursday/i }));
    await screen.findAllByRole('button', { name: /^Thursday,/ });
    // Today's cell is labelled "Today, Thursday, ..." when today is a Thursday.
    const others = dayButtons().filter(
      (day) => !/^(Today, )?Thursday,/.test(day.getAttribute('aria-label') ?? '')
    );
    expect(others.length).toBeGreaterThan(0);
    for (const day of others) expect(day).toBeDisabled();

    await user.click(others[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clears the date when the chosen Thursday is clicked again', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ThursdayDatePicker selected={THURSDAY} onSelect={onSelect} />);

    await user.click(screen.getAllByRole('button')[0]);
    await screen.findAllByRole('button', { name: /^Thursday,/ });
    const chosen = dayButtons().find(
      (day) => day.getAttribute('aria-selected') === 'true' || day.closest('[aria-selected="true"]')
    );
    expect(chosen).toBeDefined();
    await user.click(chosen as HTMLElement);

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

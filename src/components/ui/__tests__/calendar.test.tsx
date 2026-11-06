import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Calendar } from '../calendar';

describe('Calendar', () => {
  it('shows the month and previous and next buttons', () => {
    render(<Calendar mode="single" defaultMonth={new Date(2026, 10, 1)} />);

    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument();
  });

  // jsdom does no layout, so this pins the classes. The arrows were 28px wide. The day cells stay
  // 36px wide on purpose: seven of them must fit a 320px phone.
  it('makes the month arrows at least 44px wide, and keeps the day cells 36px wide', () => {
    render(<Calendar mode="single" defaultMonth={new Date(2026, 10, 1)} />);

    expect(screen.getByRole('button', { name: /previous month/i })).toHaveClass('min-w-[44px]');
    expect(screen.getByRole('button', { name: /next month/i })).toHaveClass('min-w-[44px]');
    const day = screen.getByRole('button', { name: /November 12th, 2026/ });
    expect(day).toHaveClass('size-9');
    // The cell around the button sets the column width of the seven-column week.
    expect(day.parentElement).toHaveClass('size-9');
  });
});

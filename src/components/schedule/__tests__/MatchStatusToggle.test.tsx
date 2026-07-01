import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MatchStatusToggle from '@/components/schedule/MatchStatusToggle';

describe('MatchStatusToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the label and an unchecked switch when isCompleted is false', () => {
    render(<MatchStatusToggle isCompleted={false} setIsCompleted={vi.fn()} />);

    expect(screen.getByText('Match Completed')).toBeInTheDocument();

    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
    expect(switchEl).toHaveAttribute('data-state', 'unchecked');
  });

  it('calls setIsCompleted with true when the switch is toggled on', () => {
    const setIsCompleted = vi.fn();
    render(<MatchStatusToggle isCompleted={false} setIsCompleted={setIsCompleted} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(setIsCompleted).toHaveBeenCalledTimes(1);
    expect(setIsCompleted).toHaveBeenCalledWith(true);
  });

  it('reflects the checked state when isCompleted is true', () => {
    render(<MatchStatusToggle isCompleted setIsCompleted={vi.fn()} />);

    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
    expect(switchEl).toHaveAttribute('data-state', 'checked');
  });
});

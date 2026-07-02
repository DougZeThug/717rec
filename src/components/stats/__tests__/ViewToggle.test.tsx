import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

import ViewToggle from '../ViewToggle';

describe('ViewToggle', () => {
  const onViewChange = vi.fn();

  beforeEach(() => {
    onViewChange.mockReset();
  });

  it('renders both view options', () => {
    render(<ViewToggle view="division" onViewChange={onViewChange} />);
    expect(screen.getByRole('radio', { name: 'View by Division' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'View All Teams' })).toBeInTheDocument();
  });

  it('marks the active view as selected', () => {
    render(<ViewToggle view="division" onViewChange={onViewChange} />);
    expect(screen.getByRole('radio', { name: 'View by Division' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: 'View All Teams' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('calls onViewChange with "all" when the All option is clicked', async () => {
    render(<ViewToggle view="division" onViewChange={onViewChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'View All Teams' }));
    expect(onViewChange).toHaveBeenCalledWith('all');
  });

  it('calls onViewChange with "division" when switching back', async () => {
    render(<ViewToggle view="all" onViewChange={onViewChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'View by Division' }));
    expect(onViewChange).toHaveBeenCalledWith('division');
  });

  it('does not fire onViewChange when clicking the already-active option', async () => {
    render(<ViewToggle view="division" onViewChange={onViewChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'View by Division' }));
    // Radix emits an empty value when deselecting; the guard should swallow it
    expect(onViewChange).not.toHaveBeenCalled();
  });
});

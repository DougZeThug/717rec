import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FilterToggleButton from '@/components/message-board/filter/FilterToggleButton';
import type { FilterOptions } from '@/hooks/message-board/types';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

const emptyFilters: FilterOptions = {
  category: null,
  teamId: null,
  searchQuery: null,
};

describe('FilterToggleButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the inactive state with no active filters and no count badge', () => {
    const onClick = vi.fn();
    render(<FilterToggleButton filterOptions={emptyFilters} onClick={onClick} isActive={false} />);

    const button = screen.getByRole('button', { name: 'Show filters' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    // No numeric count badge should appear when there are no active filters.
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it('fires onClick when the button is pressed', () => {
    const onClick = vi.fn();
    render(<FilterToggleButton filterOptions={emptyFilters} onClick={onClick} isActive={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show filters' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows the active/expanded state and a count badge of active filters', () => {
    const onClick = vi.fn();
    const activeFilters: FilterOptions = {
      category: 'General',
      teamId: null,
      searchQuery: 'x',
    };

    render(<FilterToggleButton filterOptions={activeFilters} onClick={onClick} isActive />);

    const button = screen.getByRole('button', { name: 'Hide filters' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    // category:'General' + searchQuery:'x' => two truthy values => badge shows '2'.
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

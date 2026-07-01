import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ActiveFilters from '@/components/message-board/filter/ActiveFilters';
import type { FilterOptions } from '@/hooks/message-board/types';

const teams = [
  { id: 't1', name: 'Wolves' },
  { id: 't2', name: 'Hawks' },
];

const noFilters: FilterOptions = {
  category: null,
  teamId: null,
  searchQuery: null,
};

describe('ActiveFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no filters are active', () => {
    const { container } = render(
      <ActiveFilters filterOptions={noFilters} onFilterChange={vi.fn()} teams={teams} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a chip for each active filter with resolved labels', () => {
    render(
      <ActiveFilters
        filterOptions={{ category: 'Announcement', teamId: 't1', searchQuery: 'hello' }}
        onFilterChange={vi.fn()}
        teams={teams}
      />
    );

    expect(screen.getByText('Announcement')).toBeInTheDocument();
    expect(screen.getByText('Team: Wolves')).toBeInTheDocument();
    expect(screen.getByText('"hello"')).toBeInTheDocument();
  });

  it('falls back to "Unknown" when the teamId has no matching team', () => {
    render(
      <ActiveFilters
        filterOptions={{ category: null, teamId: 'missing', searchQuery: null }}
        onFilterChange={vi.fn()}
        teams={teams}
      />
    );

    expect(screen.getByText('Team: Unknown')).toBeInTheDocument();
  });

  it('clears the category filter when its remove button is clicked', () => {
    const onFilterChange = vi.fn();
    render(
      <ActiveFilters
        filterOptions={{ category: 'Event', teamId: null, searchQuery: null }}
        onFilterChange={onFilterChange}
        teams={teams}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove category filter' }));
    expect(onFilterChange).toHaveBeenCalledWith({ category: null });
  });

  it('clears the team filter when its remove button is clicked', () => {
    const onFilterChange = vi.fn();
    render(
      <ActiveFilters
        filterOptions={{ category: null, teamId: 't2', searchQuery: null }}
        onFilterChange={onFilterChange}
        teams={teams}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove team filter' }));
    expect(onFilterChange).toHaveBeenCalledWith({ teamId: null });
  });

  it('clears the search filter when its remove button is clicked', () => {
    const onFilterChange = vi.fn();
    render(
      <ActiveFilters
        filterOptions={{ category: null, teamId: null, searchQuery: 'schedule' }}
        onFilterChange={onFilterChange}
        teams={teams}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove search filter' }));
    expect(onFilterChange).toHaveBeenCalledWith({ searchQuery: null });
  });
});

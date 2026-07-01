import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FilterSection from '@/components/message-board/filter/FilterSection';
import type { FilterOptions } from '@/hooks/message-board/types';

const mockUseTeams = vi.fn();

vi.mock('@/hooks/useTeams', () => ({ useTeams: () => mockUseTeams() }));

const teams = [
  { id: 't1', name: 'Wolves' },
  { id: 't2', name: 'Hawks' },
];

const emptyFilters: FilterOptions = {
  category: null,
  teamId: null,
  searchQuery: null,
};

describe('FilterSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeams.mockReturnValue({ teams });
  });

  it('renders the two Select comboboxes and the clear-filters button', () => {
    render(
      <FilterSection
        filterOptions={emptyFilters}
        onFilterChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    );

    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('emits the chosen category when a category option is picked', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterSection
        filterOptions={emptyFilters}
        onFilterChange={onFilterChange}
        onClearFilters={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByRole('option', { name: 'Announcement' }));

    expect(onFilterChange).toHaveBeenCalledWith({ category: 'Announcement' });
  });

  it('emits null when the "All Categories" option is chosen', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterSection
        filterOptions={{ ...emptyFilters, category: 'General' }}
        onFilterChange={onFilterChange}
        onClearFilters={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByRole('option', { name: 'All Categories' }));

    expect(onFilterChange).toHaveBeenCalledWith({ category: null });
  });

  it('emits the chosen team id when a team option is picked', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterSection
        filterOptions={emptyFilters}
        onFilterChange={onFilterChange}
        onClearFilters={vi.fn()}
      />
    );

    // Second combobox is the Team filter.
    fireEvent.click(screen.getAllByRole('combobox')[1]);
    fireEvent.click(screen.getByRole('option', { name: 'Hawks' }));

    expect(onFilterChange).toHaveBeenCalledWith({ teamId: 't2' });
  });

  it('fires onClearFilters when the clear button is clicked', () => {
    const onClearFilters = vi.fn();
    render(
      <FilterSection
        filterOptions={emptyFilters}
        onFilterChange={vi.fn()}
        onClearFilters={onClearFilters}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});

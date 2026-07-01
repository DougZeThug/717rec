import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SearchBar from '@/components/message-board/filter/SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the search input and the refresh button', () => {
    render(
      <SearchBar
        searchInput="hello"
        setSearchInput={vi.fn()}
        onSearchSubmit={vi.fn()}
        onRefresh={vi.fn()}
        isRefreshing={false}
      />
    );

    const input = screen.getByLabelText('Search messages');
    expect(input).toHaveValue('hello');
    expect(screen.getByRole('button', { name: 'Refresh messages' })).toBeInTheDocument();
  });

  it('calls setSearchInput with the typed value', () => {
    const setSearchInput = vi.fn();
    render(
      <SearchBar
        searchInput=""
        setSearchInput={setSearchInput}
        onSearchSubmit={vi.fn()}
        onRefresh={vi.fn()}
        isRefreshing={false}
      />
    );

    fireEvent.change(screen.getByLabelText('Search messages'), {
      target: { value: 'coaches' },
    });
    expect(setSearchInput).toHaveBeenCalledWith('coaches');
  });

  it('fires onSearchSubmit when the search form is submitted', () => {
    const onSearchSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <SearchBar
        searchInput="tips"
        setSearchInput={vi.fn()}
        onSearchSubmit={onSearchSubmit}
        onRefresh={vi.fn()}
        isRefreshing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearchSubmit).toHaveBeenCalledTimes(1);
  });

  it('fires onRefresh when the refresh button is clicked', () => {
    const onRefresh = vi.fn();
    render(
      <SearchBar
        searchInput=""
        setSearchInput={vi.fn()}
        onSearchSubmit={vi.fn()}
        onRefresh={onRefresh}
        isRefreshing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh messages' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables the refresh button while refreshing', () => {
    render(
      <SearchBar
        searchInput=""
        setSearchInput={vi.fn()}
        onSearchSubmit={vi.fn()}
        onRefresh={vi.fn()}
        isRefreshing
      />
    );

    expect(screen.getByRole('button', { name: 'Refresh messages' })).toBeDisabled();
  });
});

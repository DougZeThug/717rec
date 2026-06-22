import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Config = {
  id: string;
  enabled: boolean;
  header_title: string;
  header_subtitle: string;
};

type Bracket = {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
};

const hookMocks = vi.hoisted(() => ({
  config: {
    data: null as Config | null,
    isLoading: false,
    isError: false,
    error: null as Error | null,
  },
  brackets: {
    data: [] as Bracket[],
    isLoading: false,
    isError: false,
    error: null as Error | null,
  },
  mutations: {
    updateConfig: vi.fn().mockResolvedValue(undefined),
    createBracket: vi.fn().mockResolvedValue(undefined),
    updateBracket: vi.fn().mockResolvedValue(undefined),
    deleteBracket: vi.fn().mockResolvedValue(undefined),
    isMutating: false,
  },
}));

vi.mock('@/hooks/useChallongeFallback', () => ({
  useChallongeFallbackConfig: () => hookMocks.config,
  useChallongeFallbackBrackets: () => hookMocks.brackets,
  useChallongeFallbackMutations: () => hookMocks.mutations,
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import ChallongeFallbackSection from '../ChallongeFallbackSection';

const resetMocks = () => {
  hookMocks.config = {
    data: {
      id: 'cfg-1',
      enabled: false,
      header_title: 'Playoffs',
      header_subtitle: 'Live brackets',
    },
    isLoading: false,
    isError: false,
    error: null,
  };
  hookMocks.brackets = {
    data: [{ id: 'b-1', title: 'Competitive', slug: 'abc123', sort_order: 0 }],
    isLoading: false,
    isError: false,
    error: null,
  };
  hookMocks.mutations.updateConfig.mockClear();
  hookMocks.mutations.createBracket.mockClear();
  hookMocks.mutations.updateBracket.mockClear();
  hookMocks.mutations.deleteBracket.mockClear();
};

describe('ChallongeFallbackSection', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('shows a loading state when queries are loading', () => {
    hookMocks.config = { data: null, isLoading: true, isError: false, error: null };
    hookMocks.brackets = { data: [], isLoading: true, isError: false, error: null };
    render(<ChallongeFallbackSection />);
    expect(screen.getByText(/loading challonge settings/i)).toBeInTheDocument();
  });

  it('shows an error state when config query fails', () => {
    hookMocks.config = {
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Database connection failed'),
    };
    hookMocks.brackets = { data: [], isLoading: false, isError: false, error: null };
    render(<ChallongeFallbackSection />);
    expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/section title/i)).not.toBeInTheDocument();
  });

  it('shows an error state when brackets query fails', () => {
    hookMocks.config = {
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    };
    hookMocks.brackets = {
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('Permission denied'),
    };
    render(<ChallongeFallbackSection />);
    expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/section title/i)).not.toBeInTheDocument();
  });

  it('hydrates the form from config and brackets', () => {
    render(<ChallongeFallbackSection />);
    expect(screen.getByLabelText(/section title/i)).toHaveValue('Playoffs');
    expect(screen.getByLabelText(/section subtitle/i)).toHaveValue('Live brackets');
    expect(screen.getByDisplayValue('Competitive')).toBeInTheDocument();
    expect(screen.getByDisplayValue('abc123')).toBeInTheDocument();
  });

  it('saves edited config via updateConfig', async () => {
    const user = userEvent.setup();
    render(<ChallongeFallbackSection />);

    const title = screen.getByLabelText(/section title/i);
    await user.clear(title);
    await user.type(title, 'New Title');

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    expect(hookMocks.mutations.updateConfig).toHaveBeenCalledWith({
      id: 'cfg-1',
      enabled: false,
      header_title: 'New Title',
      header_subtitle: 'Live brackets',
    });
  });

  it('adds a new bracket via createBracket', async () => {
    const user = userEvent.setup();
    render(<ChallongeFallbackSection />);

    await user.click(screen.getByRole('button', { name: /add bracket/i }));

    const titleInputs = screen.getAllByPlaceholderText('Competitive');
    const slugInputs = screen.getAllByPlaceholderText('5hy558bb');
    const newTitle = titleInputs[titleInputs.length - 1];
    const newSlug = slugInputs[slugInputs.length - 1];
    await user.type(newTitle, 'Intermediate');
    await user.type(newSlug, 'def456');

    const addButtons = screen.getAllByRole('button', { name: 'Add' });
    await user.click(addButtons[addButtons.length - 1]);

    expect(hookMocks.mutations.createBracket).toHaveBeenCalledWith({
      title: 'Intermediate',
      slug: 'def456',
      sort_order: 1,
    });
  });

  it('updates an existing bracket via updateBracket', async () => {
    const user = userEvent.setup();
    render(<ChallongeFallbackSection />);

    const titleInput = screen.getByDisplayValue('Competitive');
    await user.clear(titleInput);
    await user.type(titleInput, 'Comp Updated');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(hookMocks.mutations.updateBracket).toHaveBeenCalledWith({
      id: 'b-1',
      title: 'Comp Updated',
      slug: 'abc123',
      sort_order: 0,
    });
  });

  it('deletes an existing bracket via deleteBracket', async () => {
    const user = userEvent.setup();
    render(<ChallongeFallbackSection />);

    await user.click(screen.getByRole('button', { name: /remove bracket/i }));

    expect(hookMocks.mutations.deleteBracket).toHaveBeenCalledWith('b-1');
  });

  it('removes a new (unsaved) row locally without a network call', async () => {
    const user = userEvent.setup();
    render(<ChallongeFallbackSection />);

    await user.click(screen.getByRole('button', { name: /add bracket/i }));
    expect(screen.getAllByRole('button', { name: /remove bracket/i })).toHaveLength(2);

    const removeButtons = screen.getAllByRole('button', { name: /remove bracket/i });
    await user.click(removeButtons[removeButtons.length - 1]);

    expect(hookMocks.mutations.deleteBracket).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: /remove bracket/i })).toHaveLength(1);
    // silence unused import
    void within;
  });

  it('preserves unsaved new rows when brackets data refetches (regression)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ChallongeFallbackSection />);

    // Add two new unsaved rows and type unique data into each
    await user.click(screen.getByRole('button', { name: /add bracket/i }));
    await user.click(screen.getByRole('button', { name: /add bracket/i }));

    const titleInputs = screen.getAllByPlaceholderText('Competitive');
    const slugInputs = screen.getAllByPlaceholderText('5hy558bb');
    await user.type(titleInputs[titleInputs.length - 2], 'Pending One');
    await user.type(slugInputs[slugInputs.length - 2], 'pend1');
    await user.type(titleInputs[titleInputs.length - 1], 'Pending Two');
    await user.type(slugInputs[slugInputs.length - 1], 'pend2');

    // Simulate a refetch of brackets (e.g. after another save) returning fresh server data
    hookMocks.brackets = {
      data: [
        { id: 'b-1', title: 'Competitive', slug: 'abc123', sort_order: 0 },
        { id: 'b-2', title: 'Recreational', slug: 'rec999', sort_order: 1 },
      ],
      isLoading: false,
      isError: false,
      error: null,
    };
    rerender(<ChallongeFallbackSection />);

    // Saved rows reflect server state
    expect(screen.getByDisplayValue('Competitive')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Recreational')).toBeInTheDocument();
    // Unsaved rows are preserved with their typed data
    expect(screen.getByDisplayValue('Pending One')).toBeInTheDocument();
    expect(screen.getByDisplayValue('pend1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pending Two')).toBeInTheDocument();
    expect(screen.getByDisplayValue('pend2')).toBeInTheDocument();
  });

  it('drops a new row once its data appears in the refetched server brackets', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ChallongeFallbackSection />);

    await user.click(screen.getByRole('button', { name: /add bracket/i }));
    const titleInputs = screen.getAllByPlaceholderText('Competitive');
    const slugInputs = screen.getAllByPlaceholderText('5hy558bb');
    await user.type(titleInputs[titleInputs.length - 1], 'Intermediate');
    await user.type(slugInputs[slugInputs.length - 1], 'def456');

    // Server now includes the just-created bracket — local isNew row should be replaced
    hookMocks.brackets = {
      data: [
        { id: 'b-1', title: 'Competitive', slug: 'abc123', sort_order: 0 },
        { id: 'b-2', title: 'Intermediate', slug: 'def456', sort_order: 1 },
      ],
      isLoading: false,
      isError: false,
      error: null,
    };
    rerender(<ChallongeFallbackSection />);

    // Only two rows, no duplicate Intermediate entry
    expect(screen.getAllByDisplayValue('Intermediate')).toHaveLength(1);
    expect(screen.getAllByDisplayValue('def456')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /remove bracket/i })).toHaveLength(2);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MessageFeed from '@/components/message-board/MessageFeed';
import MessageFilterBar from '@/components/message-board/MessageFilterBar';
import MessageInput from '@/components/message-board/MessageInput';
import MessageEditForm from '@/components/message-board/message-item/MessageEditForm';
import MessageControls from '@/components/message-board/message-item/MessageControls';
import MessageReactions from '@/components/message-board/reactions/MessageReactions';
import type { FilterOptions } from '@/hooks/message-board/types';
import type { Message } from '@/types/reactions';

const mockUseAuth = vi.fn();
const mockUseAdminAccess = vi.fn();
const mockUseTeams = vi.fn();
const mockToast = vi.fn();
const mockUseInView = vi.fn();
const mockUseMessageReactions = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));
vi.mock('@/hooks/useTeams', () => ({ useTeams: () => mockUseTeams() }));
vi.mock('@/hooks/useToast', () => ({ toast: (payload: unknown) => mockToast(payload) }));
vi.mock('react-intersection-observer', () => ({ useInView: () => mockUseInView() }));
vi.mock('@/hooks/message-board/useMessageReactions', () => ({
  useMessageReactions: (messageId: string) => mockUseMessageReactions(messageId),
}));

vi.mock('@/components/message-board/MessageItem', () => ({
  default: ({ message }: { message: Message }) => <article>{message.content}</article>,
}));

const fixtureMessages: Message[] = [
  {
    id: 'm-1',
    content: 'General post about schedule',
    category: 'General',
    created_at: '2026-04-30T10:00:00.000Z',
    updated_at: null,
    is_edited: false,
    team_id: 't1',
    user_id: 'u1',
    username: 'Alice',
    team_name: 'Wolves',
  },
  {
    id: 'm-2',
    content: 'Practice tips from coaches',
    category: 'Tips',
    created_at: '2026-04-30T09:00:00.000Z',
    updated_at: null,
    is_edited: false,
    team_id: 't2',
    user_id: 'u2',
    username: 'Bob',
    team_name: 'Hawks',
  },
];

const withClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('message board main flow components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true });
    mockUseTeams.mockReturnValue({ teams: [{ id: 't1', name: 'Wolves' }, { id: 't2', name: 'Hawks' }] });
    mockUseInView.mockReturnValue({ ref: vi.fn(), inView: false });
  });

  it('renders feed with fixture-driven data and requests more when in view', () => {
    const onLoadMore = vi.fn();
    mockUseInView.mockReturnValue({ ref: vi.fn(), inView: true });

    withClient(
      <MessageFeed
        messages={fixtureMessages}
        isLoading={false}
        error={null}
        onDeleteMessage={vi.fn()}
        onEditMessage={vi.fn()}
        hasMore
        onLoadMore={onLoadMore}
        loadingMore={false}
      />
    );

    expect(screen.getByText('General post about schedule')).toBeInTheDocument();
    expect(screen.getByText('Practice tips from coaches')).toBeInTheDocument();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('updates visible items through filter/search controls and active filter chips', () => {
    const onFilterChange = vi.fn();
    const onRefresh = vi.fn();
    const filterOptions: FilterOptions = { category: 'Tips', teamId: 't1', searchQuery: 'schedule' };

    withClient(
      <MessageFilterBar
        filterOptions={filterOptions}
        onFilterChange={onFilterChange}
        onRefresh={onRefresh}
        isRefreshing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ searchQuery: 'schedule' });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh messages' }));
    expect(onRefresh).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /remove category filter/i }));
    fireEvent.click(screen.getByRole('button', { name: /remove team filter/i }));
    fireEvent.click(screen.getByRole('button', { name: /remove search filter/i }));

    expect(onFilterChange).toHaveBeenCalledWith({ category: null });
    expect(onFilterChange).toHaveBeenCalledWith({ teamId: null });
    expect(onFilterChange).toHaveBeenCalledWith({ searchQuery: null });

    fireEvent.click(screen.getByRole('button', { name: /show filters/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ category: null, teamId: null, searchQuery: null });
  });

  it('handles composer validation and category selection', async () => {
    const onSend = vi.fn().mockResolvedValue();
    withClient(<MessageInput onSend={onSend} />);

    const textbox = screen.getByPlaceholderText('Type a message...');
    fireEvent.click(screen.getByRole('button', { name: '' }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Empty message' }));

    fireEvent.change(textbox, { target: { value: 'x'.repeat(501) } });
    const sendButton = screen.getAllByRole('button').find((btn) => btn.getAttribute('type') === 'submit');
    expect(sendButton).toBeDisabled();

    fireEvent.change(textbox, { target: { value: '  valid admin announcement  ' } });
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Announcement' }));
    const form = textbox.closest('form');
    expect(form).not.toBeNull();
    if (!form) {
      throw new Error('Expected composer form to exist');
    }
    fireEvent.submit(form);

    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith('valid admin announcement', 'Announcement')
    );
  });

  it('supports message edit/cancel/save and permission branches in controls', async () => {
    const onSave = vi.fn().mockResolvedValue();
    const onCancel = vi.fn();

    withClient(<MessageEditForm content="Original text" onSave={onSave} onCancel={onCancel} />);

    fireEvent.change(screen.getByPlaceholderText('Edit message...'), { target: { value: 'Updated text' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Updated text'));

    fireEvent.keyDown(screen.getByPlaceholderText('Edit message...'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();

    const onDelete = vi.fn().mockResolvedValue();
    const setShowDeleteConfirm = vi.fn();
    const setShowOptions = vi.fn();

    const { rerender } = withClient(
      <MessageControls
        isAuthor={false}
        showOptions
        isDeleting={false}
        showDeleteConfirm={false}
        setShowDeleteConfirm={setShowDeleteConfirm}
        setShowOptions={setShowOptions}
        onDelete={onDelete}
        onEdit={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MessageControls
          isAuthor
          showOptions
          isDeleting={false}
          showDeleteConfirm
          setShowDeleteConfirm={setShowDeleteConfirm}
          setShowOptions={setShowOptions}
          onDelete={onDelete}
          onEdit={vi.fn()}
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
  });

  it('toggles reactions and shows error rollback via toast', () => {
    const addReaction = vi.fn((emoji: string) => {
      if (emoji === '🔥') {
        mockToast({ title: 'Error', description: 'Failed to add reaction', variant: 'destructive' });
      }
    });

    mockUseMessageReactions.mockReturnValue({
      reactionCounts: [
        { emoji: '👍', count: 2, users: ['u1', 'u2'], hasReacted: true },
        { emoji: '🔥', count: 1, users: ['u3'], hasReacted: false },
      ],
      addReaction,
      isLoading: false,
    });

    withClient(<MessageReactions messageId="m-1" showPicker={false} />);

    const group = screen.getByRole('group', { name: 'Message reactions' });
    fireEvent.click(within(group).getByRole('button', { name: '👍 reaction (2)' }));
    fireEvent.click(within(group).getByRole('button', { name: '🔥 reaction (1)' }));

    expect(addReaction).toHaveBeenNthCalledWith(1, '👍');
    expect(addReaction).toHaveBeenNthCalledWith(2, '🔥');
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Failed to add reaction' })
    );
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MessageBoard from '../MessageBoard';

const mockUseMessageBoard = vi.fn();
const mockUseAuth = vi.fn();
const mockToast = vi.fn();

vi.mock('@/hooks/useMessageBoard', () => ({ useMessageBoard: () => mockUseMessageBoard() }));
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useToast', () => ({ toast: (...args: unknown[]) => mockToast(...args) }));

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/layout/PageHeader', () => ({
  default: ({ title }: { title: React.ReactNode }) => <h1>{title}</h1>,
}));
vi.mock('@/components/transitions/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/message-board/MessageFilterBar', () => ({
  default: ({
    onFilterChange,
    onRefresh,
  }: {
    onFilterChange: (value: string) => void;
    onRefresh: () => Promise<void>;
  }) => (
    <>
      <button onClick={() => onFilterChange('announcements')}>Filter Announcements</button>
      <button
        onClick={() => {
          onRefresh();
        }}
      >
        Refresh Messages
      </button>
    </>
  ),
}));
vi.mock('@/components/message-board/MessageFeed', () => ({
  default: ({
    messages,
    isLoading,
    error,
  }: {
    messages: Array<{ id: string; content: string }>;
    isLoading: boolean;
    error: string | null;
  }) => {
    if (isLoading) return <p>Loading messages...</p>;
    if (error) return <p>{error}</p>;
    if (messages.length === 0) return <p>No Messages Yet</p>;
    return (
      <ul>
        {messages.map((message) => (
          <li key={message.id}>{message.content}</li>
        ))}
      </ul>
    );
  },
}));
vi.mock('@/components/message-board/MessageInput', () => ({
  default: ({ onSend }: { onSend: (content: string) => Promise<void> }) => (
    <button onClick={async () => await onSend('Hello from test')}>Send Message</button>
  ),
}));
vi.mock('@/components/message-board/LoginPrompt', () => ({ default: () => <p>Please log in</p> }));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const renderPage = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <MessageBoard />
      </MemoryRouter>
    </QueryClientProvider>
  );

const baseMessageBoardState = {
  messages: [],
  isLoading: false,
  error: null,
  postMessage: vi.fn().mockImplementation(() => Promise.resolve()),
  editMessage: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteMessage: vi.fn().mockImplementation(() => Promise.resolve()),
  hasMore: false,
  loadingMore: false,
  loadMoreMessages: vi.fn(),
  refreshMessages: vi.fn().mockImplementation(() => Promise.resolve()),
  filterOptions: { type: 'all' },
  setFilter: vi.fn(),
};

describe('MessageBoard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockUseMessageBoard.mockReturnValue(baseMessageBoardState);
  });

  it('shows loading state', () => {
    mockUseMessageBoard.mockReturnValue({ ...baseMessageBoardState, isLoading: true });
    renderPage();
    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
  });

  it('shows empty state when there are no messages', () => {
    renderPage();
    expect(screen.getByText('No Messages Yet')).toBeInTheDocument();
  });

  it('shows success state with messages', () => {
    mockUseMessageBoard.mockReturnValue({
      ...baseMessageBoardState,
      messages: [{ id: 'm1', content: 'League update posted' }],
    });
    renderPage();
    expect(screen.getByText('League update posted')).toBeInTheDocument();
  });

  it('shows error fallback when message load fails', () => {
    mockUseMessageBoard.mockReturnValue({
      ...baseMessageBoardState,
      error: 'Unable to load messages',
    });
    renderPage();
    expect(screen.getByText('Unable to load messages')).toBeInTheDocument();
  });

  it('applies filter via MessageFilterBar wiring', () => {
    const setFilter = vi.fn();
    mockUseMessageBoard.mockReturnValue({ ...baseMessageBoardState, setFilter });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Filter Announcements' }));
    expect(setFilter).toHaveBeenCalledWith('announcements');
  });

  it('shows MessageInput only for authenticated users and LoginPrompt otherwise', () => {
    const { unmount } = renderPage();
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeInTheDocument();
    unmount();
    mockUseAuth.mockReturnValue({ user: null });
    renderPage();
    expect(screen.getByText('Please log in')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send Message' })).not.toBeInTheDocument();
  });
});

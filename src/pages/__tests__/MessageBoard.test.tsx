import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
vi.mock('@/components/seo/SeoHead', () => ({ default: () => null }));
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
    isSignedOut,
  }: {
    messages: Array<{ id: string; content: string }>;
    isLoading: boolean;
    error: string | null;
    isSignedOut?: boolean;
  }) => {
    if (isLoading) return <p>Loading messages...</p>;
    if (error) return <p>{error}</p>;
    if (messages.length === 0)
      return <p>{isSignedOut ? 'Sign in to read the board' : 'No Messages Yet'}</p>;
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
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, authInitialized: true });
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

  // B-16: the database returns no rows to a signed-out reader rather than
  // refusing the read, so the empty board must not be reported as an empty
  // league.
  it('tells a signed-out visitor to sign in instead of claiming the board is empty', () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: true });
    renderPage();
    expect(screen.getByText('Sign in to read the board')).toBeInTheDocument();
    expect(screen.queryByText('No Messages Yet')).not.toBeInTheDocument();
  });

  it('waits for auth to settle before claiming nobody is signed in', () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: false });
    renderPage();
    expect(screen.queryByText('Sign in to read the board')).not.toBeInTheDocument();
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

  // B-16: the refresh read succeeds and returns nothing for a signed-out
  // visitor, so a plain success toast told them messages had been loaded.
  it('does not claim messages were loaded when nobody is signed in', async () => {
    mockUseAuth.mockReturnValue({ user: null, authInitialized: true });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Messages' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sign in to read messages' })
    );
  });

  it('confirms the refresh for a signed-in reader', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Messages' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Messages refreshed' })
    );
  });

  it('shows MessageInput only for authenticated users and LoginPrompt otherwise', () => {
    const { unmount } = renderPage();
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeInTheDocument();
    unmount();
    mockUseAuth.mockReturnValue({ user: null, authInitialized: true });
    renderPage();
    expect(screen.getByText('Please log in')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send Message' })).not.toBeInTheDocument();
  });
});

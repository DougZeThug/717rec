import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MessageBoard from '../MessageBoard';

const mockUseMessageBoard = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/hooks/useMessageBoard', () => ({
  useMessageBoard: () => mockUseMessageBoard(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

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
  default: ({ onFilterChange }: { onFilterChange: (value: string) => void }) => (
    <button onClick={() => onFilterChange('announcements')}>Filter Announcements</button>
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

vi.mock('@/components/message-board/MessageInput', () => {
  const MockMessageInput = ({ onSend }: { onSend: (content: string) => Promise<void> }) => {
    const [submitted, setSubmitted] = React.useState('');
    return (
      <div>
        <button
          onClick={async () => {
            await onSend('Hello from test');
            setSubmitted('Message submitted');
          }}
        >
          Send Message
        </button>
        {submitted && <p>{submitted}</p>}
      </div>
    );
  };

  return { default: MockMessageInput };
});

vi.mock('@/components/message-board/LoginPrompt', () => ({
  default: () => <p>Please log in</p>,
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MessageBoard />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const baseMessageBoardState = {
  messages: [],
  isLoading: false,
  error: null,
  postMessage: vi.fn().mockResolvedValue(),
  editMessage: vi.fn().mockResolvedValue(),
  deleteMessage: vi.fn().mockResolvedValue(),
  hasMore: false,
  loadingMore: false,
  loadMoreMessages: vi.fn(),
  refreshMessages: vi.fn().mockResolvedValue(),
  filterOptions: { type: 'all' },
  setFilter: vi.fn(),
};

describe('MessageBoard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
  });

  it('shows loading state', () => {
    mockUseMessageBoard.mockReturnValue({
      ...baseMessageBoardState,
      isLoading: true,
    });

    renderPage();

    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
  });

  it('shows empty state when there are no messages', () => {
    mockUseMessageBoard.mockReturnValue(baseMessageBoardState);

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

  it('shows error state when message load fails', () => {
    mockUseMessageBoard.mockReturnValue({
      ...baseMessageBoardState,
      error: 'Unable to load messages',
    });

    renderPage();

    expect(screen.getByText('Unable to load messages')).toBeInTheDocument();
  });

  it('applies a filter when the filter interaction is used', () => {
    const setFilter = vi.fn();
    mockUseMessageBoard.mockReturnValue({
      ...baseMessageBoardState,
      setFilter,
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Filter Announcements' }));

    expect(setFilter).toHaveBeenCalledWith('announcements');
  });

  it('lets an authenticated user submit a message', async () => {
    const postMessage = vi.fn().mockResolvedValue();
    mockUseMessageBoard.mockReturnValue({
      ...baseMessageBoardState,
      postMessage,
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByText('Message submitted')).toBeInTheDocument();
  });
});

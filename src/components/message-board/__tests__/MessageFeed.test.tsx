import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const viewState = vi.hoisted(() => ({ inView: false }));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: viewState.inView }),
}));
vi.mock('../MessageFeedSkeleton', () => ({
  default: ({ count }: { count: number }) => <div data-testid="feed-skeleton" data-count={count} />,
}));
vi.mock('../MessageItem', () => ({ default: () => <div data-testid="message-item" /> }));

import type { Message } from '@/types/reactions';

import MessageFeed from '../MessageFeed';

const renderFeed = (props: { isLoading?: boolean; error?: string | null }) =>
  render(
    <MemoryRouter>
      <MessageFeed
        messages={[]}
        isLoading={props.isLoading ?? false}
        error={props.error ?? null}
        onDeleteMessage={vi.fn()}
        onEditMessage={vi.fn()}
        hasMore={false}
        onLoadMore={vi.fn()}
        loadingMore={false}
      />
    </MemoryRouter>
  );

describe('MessageFeed', () => {
  it('shows the loading skeleton while the first page loads', () => {
    renderFeed({ isLoading: true });

    expect(screen.getByTestId('feed-skeleton')).toHaveAttribute('data-count', '5');
  });

  it('shows the error and a refresh hint when loading fails', () => {
    renderFeed({ error: 'Could not load messages' });

    expect(screen.getByText('Could not load messages')).toBeInTheDocument();
    expect(screen.getByText('Please try refreshing the page')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-skeleton')).not.toBeInTheDocument();
  });
});

// A failed "load more" flips loadingMore back to false. With the sentinel still
// in view, the scroll effect used to fire again at once and retry in a loop.
describe('MessageFeed load more', () => {
  beforeEach(() => {
    viewState.inView = true;
    // jsdom has no ResizeObserver, and the scroll area uses one.
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function () {
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
      })
    );
  });

  const renderWithMessages = (props: { loadMoreError?: boolean; onLoadMore: () => void }) =>
    render(
      <MemoryRouter>
        <MessageFeed
          messages={[{ id: 'm1' } as Message]}
          isLoading={false}
          error={null}
          onDeleteMessage={vi.fn()}
          onEditMessage={vi.fn()}
          hasMore
          onLoadMore={props.onLoadMore}
          loadingMore={false}
          loadMoreError={props.loadMoreError}
        />
      </MemoryRouter>
    );

  it('loads more on its own when the end of the list is in view', () => {
    const onLoadMore = vi.fn();

    renderWithMessages({ onLoadMore });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not retry on its own after a failed load, and offers Try again', async () => {
    const onLoadMore = vi.fn();
    const user = userEvent.setup();

    renderWithMessages({ loadMoreError: true, onLoadMore });

    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByText(/couldn.t load more messages/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});

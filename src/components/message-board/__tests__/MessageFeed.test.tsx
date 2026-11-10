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

// Radix ScrollArea puts an inline display:table on the viewport's content div.
// A table grows to fit its widest word, so a long URL pushed posts past the
// right edge of the box on a phone. The feed forces that div back to block.
describe('MessageFeed scroll box width', () => {
  beforeEach(() => {
    viewState.inView = false;
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function () {
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
      })
    );
  });

  it('forces the scroll area content wrapper to display block', () => {
    const { container } = render(
      <MemoryRouter>
        <MessageFeed
          messages={[{ id: 'm1' } as Message]}
          isLoading={false}
          error={null}
          onDeleteMessage={vi.fn()}
          onEditMessage={vi.fn()}
          hasMore={false}
          onLoadMore={vi.fn()}
          loadingMore={false}
        />
      </MemoryRouter>
    );

    const viewport = container.querySelector('[data-radix-scroll-area-viewport]');
    expect(viewport).not.toBeNull();
    expect(viewport?.parentElement).toHaveClass('[&_[data-radix-scroll-area-viewport]>div]:block!');
    // The table display that the class overrides is still what Radix renders.
    expect((viewport?.firstElementChild as HTMLElement).style.display).toBe('table');
  });
});

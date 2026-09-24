import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: false }),
}));
vi.mock('../MessageFeedSkeleton', () => ({
  default: ({ count }: { count: number }) => <div data-testid="feed-skeleton" data-count={count} />,
}));
vi.mock('../MessageItem', () => ({ default: () => <div data-testid="message-item" /> }));

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

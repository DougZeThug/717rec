import { fireEvent, render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';

import { LastUpdated } from '../LastUpdated';

describe('LastUpdated', () => {
  it('shows when the data arrived and lets the reader refresh it', () => {
    const onRefresh = vi.fn();
    const at = new Date(2026, 9, 8, 14, 41).getTime();
    render(<LastUpdated updatedAt={at} isRefreshing={false} onRefresh={onRefresh} />);

    // Sighted readers see the minute; a screen reader gets the second too.
    expect(screen.getByText(`Updated ${format(at, 'h:mm a')}`)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(`Updated ${format(at, 'h:mm:ss a')}`);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('announces a refresh even when it lands in the same minute as the last one', () => {
    const { rerender } = render(
      <LastUpdated
        updatedAt={new Date(2026, 9, 8, 14, 41, 5).getTime()}
        isRefreshing={false}
        onRefresh={vi.fn()}
      />
    );
    const first = screen.getByRole('status').textContent;

    rerender(
      <LastUpdated
        updatedAt={new Date(2026, 9, 8, 14, 41, 40).getTime()}
        isRefreshing={false}
        onRefresh={vi.fn()}
      />
    );

    // The visible minute is unchanged, so only the seconds can tell the two apart.
    expect(screen.getByRole('status').textContent).not.toBe(first);
  });

  it('turns the button off while a refresh is under way', () => {
    render(<LastUpdated updatedAt={Date.now()} isRefreshing onRefresh={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  });

  it('says nothing before any data has arrived', () => {
    const { container } = render(
      <LastUpdated updatedAt={0} isRefreshing={false} onRefresh={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

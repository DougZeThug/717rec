import { fireEvent, render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';

import { LastUpdated } from '../LastUpdated';

describe('LastUpdated', () => {
  it('shows when the data arrived and lets the reader refresh it', () => {
    const onRefresh = vi.fn();
    const at = new Date(2026, 9, 8, 14, 41).getTime();
    render(<LastUpdated updatedAt={at} isRefreshing={false} onRefresh={onRefresh} />);

    expect(screen.getByRole('status')).toHaveTextContent(`Updated ${format(at, 'h:mm a')}`);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
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

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CategorySelector from '@/components/message-board/message-input/CategorySelector';

describe('CategorySelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers both General and Announcement when adminOnly is true and reports the selection', () => {
    const onChange = vi.fn();
    render(<CategorySelector value="General" onChange={onChange} adminOnly />);

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByRole('option', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Announcement' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Announcement' }));
    expect(onChange).toHaveBeenCalledWith('Announcement');
  });

  it('gates the Announcement option behind adminOnly (default false)', () => {
    const onChange = vi.fn();
    render(<CategorySelector value="General" onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByRole('option', { name: 'General' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Announcement' })).not.toBeInTheDocument();
  });
});

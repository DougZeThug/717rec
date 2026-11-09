import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MessageEditForm from '../MessageEditForm';

describe('MessageEditForm', () => {
  it('uses 16px text on a phone so iPhone Safari does not zoom into the box', () => {
    render(<MessageEditForm content="Great games" onSave={vi.fn()} onCancel={vi.fn()} />);
    const box = screen.getByRole('textbox', { name: 'Edit message' });

    // 14px from 768px up, as before.
    expect(box).toHaveClass('text-base', 'md:text-sm');
    expect(box).not.toHaveClass('text-sm');
  });
});

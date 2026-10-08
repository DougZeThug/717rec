import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageSentCard } from '../MessageSentCard';

describe('MessageSentCard', () => {
  it('confirms the message was sent and lets the user write another', () => {
    const onSendAnother = vi.fn();
    render(<MessageSentCard onSendAnother={onSendAnother} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Message Sent!' })).toBeInTheDocument();
    expect(screen.getByText(/get back to you within 24-48 hours/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Send Another Message' }));
    expect(onSendAnother).toHaveBeenCalledTimes(1);
  });
});

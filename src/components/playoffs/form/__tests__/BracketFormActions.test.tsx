
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BracketFormActions } from '../BracketFormActions';

describe('BracketFormActions', () => {
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders submit and cancel buttons', () => {
    render(<BracketFormActions isSubmitting={false} onCancel={mockOnCancel} />);
    
    const submitButton = screen.getByText('Create Bracket');
    const cancelButton = screen.getByText('Cancel');
    
    expect(submitButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });

  it('shows loading text when submitting', () => {
    render(<BracketFormActions isSubmitting={true} onCancel={mockOnCancel} />);
    
    const loadingText = screen.getByText('Creating...');
    expect(loadingText).toBeInTheDocument();
  });

  it('disables both buttons when submitting', () => {
    render(<BracketFormActions isSubmitting={true} onCancel={mockOnCancel} />);
    
    const submitButton = screen.getByText('Creating...');
    const cancelButton = screen.getByText('Cancel');
    
    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(<BracketFormActions isSubmitting={false} onCancel={mockOnCancel} />);
    
    const user = userEvent.setup();
    const cancelButton = screen.getByText('Cancel');
    
    await user.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});

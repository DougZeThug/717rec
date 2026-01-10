import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BracketFormActions } from '../BracketFormActions';

describe('BracketFormActions', () => {
  const mockOnCancel = vi.fn();
  const mockForm: UseFormReturn<any> = {
    formState: { isValid: true },
    // ... other form properties would be here in a real implementation
  } as UseFormReturn<any>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders submit and cancel buttons', () => {
    render(<BracketFormActions isSubmitting={false} onCancel={mockOnCancel} form={mockForm} />);

    const submitButton = screen.getByText('Create Bracket');
    const cancelButton = screen.getByText('Cancel');

    expect(submitButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });

  it('shows loading text when submitting', () => {
    render(<BracketFormActions isSubmitting={true} onCancel={mockOnCancel} form={mockForm} />);

    const loadingText = screen.getByText('Creating...');
    expect(loadingText).toBeInTheDocument();
  });

  it('disables both buttons when submitting', () => {
    render(<BracketFormActions isSubmitting={true} onCancel={mockOnCancel} form={mockForm} />);

    const submitButton = screen.getByText('Creating...');
    const cancelButton = screen.getByText('Cancel');

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(<BracketFormActions isSubmitting={false} onCancel={mockOnCancel} form={mockForm} />);

    const user = userEvent.setup();
    const cancelButton = screen.getByText('Cancel');

    await user.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when form is invalid', () => {
    const invalidForm = {
      formState: { isValid: false },
    } as UseFormReturn<any>;

    render(
      <BracketFormActions
        isSubmitting={false}
        onCancel={mockOnCancel}
        form={invalidForm}
        teamsValid={false}
      />
    );

    const submitButton = screen.getByText('Create Bracket');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when form and teams are valid', () => {
    const validForm = {
      formState: { isValid: true },
    } as UseFormReturn<any>;

    render(
      <BracketFormActions
        isSubmitting={false}
        onCancel={mockOnCancel}
        form={validForm}
        teamsValid={true}
      />
    );

    const submitButton = screen.getByText('Create Bracket');
    expect(submitButton).not.toBeDisabled();
  });
});

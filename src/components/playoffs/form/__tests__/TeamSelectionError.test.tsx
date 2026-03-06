import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { TeamSelectionError } from '../bracket-teams/components/TeamSelectionError';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('TeamSelectionError', () => {
  it('renders default error message', () => {
    renderWithRouter(<TeamSelectionError />);

    expect(screen.getByText('Error Loading Teams')).toBeInTheDocument();
    expect(screen.getByText('Failed to load teams')).toBeInTheDocument();
  });

  it('renders custom error message', () => {
    renderWithRouter(<TeamSelectionError message="Custom error message" />);

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    const mockRetry = vi.fn();
    renderWithRouter(<TeamSelectionError onRetry={mockRetry} />);

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
  });

  it('does not show retry button when onRetry is not provided', () => {
    renderWithRouter(<TeamSelectionError />);

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('applies error styling', () => {
    renderWithRouter(<TeamSelectionError />);

    const card = screen.getByText('Error Loading Teams').closest('[class*="border-destructive"]');
    expect(card).toBeInTheDocument();
  });
});

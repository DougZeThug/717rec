
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TeamSelectionError } from '../bracket-teams/components/TeamSelectionError';

describe('TeamSelectionError', () => {
  it('renders default error message', () => {
    render(<TeamSelectionError />);
    
    expect(screen.getByText('Error Loading Teams')).toBeInTheDocument();
    expect(screen.getByText('Failed to load teams')).toBeInTheDocument();
  });

  it('renders custom error message', () => {
    render(<TeamSelectionError message="Custom error message" />);
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    const mockRetry = vi.fn();
    render(<TeamSelectionError onRetry={mockRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
  });

  it('does not show retry button when onRetry is not provided', () => {
    render(<TeamSelectionError />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('applies error styling', () => {
    render(<TeamSelectionError />);
    
    const card = screen.getByText('Error Loading Teams').closest('[class*="border-destructive"]');
    expect(card).toBeInTheDocument();
  });
});

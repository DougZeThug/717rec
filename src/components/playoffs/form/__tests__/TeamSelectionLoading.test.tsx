import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { TeamSelectionLoading } from '../bracket-teams/components/TeamSelectionLoading';

describe('TeamSelectionLoading', () => {
  it('renders loading skeleton structure', () => {
    render(<TeamSelectionLoading />);

    // Check for skeleton elements
    const skeletons =
      screen.getAllByTestId(/skeleton/) ||
      document.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows multiple loading cards', () => {
    render(<TeamSelectionLoading />);

    // Should have multiple card structures for skeleton loading
    const cards = document.querySelectorAll('[class*="card"], .card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('displays loading state layout', () => {
    render(<TeamSelectionLoading />);

    // Should have the container structure
    const container = document.querySelector('[class*="space-y"]');
    expect(container).toBeInTheDocument();
  });
});

import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { TeamSelectionLoading } from '../bracket-teams/components/TeamSelectionLoading';

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('TeamSelectionLoading', () => {
  it('renders loading skeleton structure', () => {
    renderWithRouter(<TeamSelectionLoading />);

    // ShimmerSkeleton renders divs with bg-muted class
    const skeletonElements = document.querySelectorAll('[class*="bg-muted"]');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('shows multiple loading cards', () => {
    renderWithRouter(<TeamSelectionLoading />);

    // Card component renders with bg-card class
    const cards = document.querySelectorAll('[class*="bg-card"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('displays loading state layout', () => {
    renderWithRouter(<TeamSelectionLoading />);

    // Should have the container structure with space-y class
    const container = document.querySelector('[class*="space-y"]');
    expect(container).toBeInTheDocument();
  });
});

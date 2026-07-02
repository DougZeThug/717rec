import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import ChartEmptyState from '../ChartEmptyState';

describe('ChartEmptyState', () => {
  it('shows the default message when none is provided', () => {
    render(<ChartEmptyState />);
    expect(screen.getByText('No data available yet')).toBeInTheDocument();
  });

  it('shows a custom message', () => {
    render(<ChartEmptyState message="No matches played this season" />);
    expect(screen.getByText('No matches played this season')).toBeInTheDocument();
    expect(screen.queryByText('No data available yet')).not.toBeInTheDocument();
  });

  it('applies a custom className to the container', () => {
    const { container } = render(<ChartEmptyState className="h-64" />);
    expect(container.firstElementChild?.className).toContain('h-64');
  });
});

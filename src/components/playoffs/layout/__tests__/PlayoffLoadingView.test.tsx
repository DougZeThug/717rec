import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { PlayoffLoadingView } from '../PlayoffLoadingView';

describe('PlayoffLoadingView', () => {
  it('announces its label as a status, so a screen reader hears that the page is loading', () => {
    render(<PlayoffLoadingView label="Loading bracket..." />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading bracket...');
  });

  it('says "Loading..." when no label is given', () => {
    render(<PlayoffLoadingView />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('colours the spinner with the theme primary, not the dark navy that vanishes on the dark page', () => {
    const { container } = render(<PlayoffLoadingView />);
    const spinner = container.querySelector('svg');

    expect(spinner).toHaveClass('text-primary');
    expect(spinner).not.toHaveClass('text-cornhole-navy');
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });
});

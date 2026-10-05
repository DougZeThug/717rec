import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import RealtimeIndicator from '../RealtimeIndicator';

describe('RealtimeIndicator', () => {
  it('shows nothing when live updates are off', () => {
    render(<RealtimeIndicator enabled={false} />);

    expect(screen.queryByText('Live updates enabled')).not.toBeInTheDocument();
  });

  it('shows the pill when live updates are on, outside the page layout box', () => {
    const { container } = render(<RealtimeIndicator enabled />);

    const pill = screen.getByText('Live updates enabled');
    expect(pill).toBeInTheDocument();
    // Portalled to the body, so a parent that traps fixed children cannot move it.
    expect(container).not.toContainElement(pill);
  });
});

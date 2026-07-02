import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockIsMobile = false;
vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

import { PowerScoreInfo } from '../PowerScoreInfo';

describe('PowerScoreInfo', () => {
  beforeEach(() => {
    mockIsMobile = false;
  });

  it('renders an accessible info trigger on desktop', () => {
    render(<PowerScoreInfo />);
    expect(screen.getByRole('button', { name: 'Power Score information' })).toBeInTheDocument();
  });

  it('renders an accessible info trigger on mobile', () => {
    mockIsMobile = true;
    render(<PowerScoreInfo />);
    expect(screen.getByRole('button', { name: 'Power Score information' })).toBeInTheDocument();
  });

  it('opens a popover explaining the formula on mobile tap', async () => {
    mockIsMobile = true;
    render(<PowerScoreInfo />);

    await userEvent.click(screen.getByRole('button', { name: 'Power Score information' }));

    expect(
      screen.getByText(/match win percentage \(40%\), strength of schedule \(45%\)/i)
    ).toBeInTheDocument();
  });
});

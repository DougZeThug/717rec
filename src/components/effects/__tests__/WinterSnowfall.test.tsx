import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WinterSnowfall } from '@/components/effects/WinterSnowfall';

const mockUseSeasonalTheme = vi.fn();
const mockUsePrefersReducedMotion = vi.fn();

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => mockUseSeasonalTheme(),
}));

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mockUsePrefersReducedMotion(),
}));

vi.mock('react-snowfall', () => ({
  default: () => <div data-testid="snowfall" />,
}));

describe('WinterSnowfall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('snows when the winter theme is on and motion is allowed', () => {
    mockUseSeasonalTheme.mockReturnValue({ shouldApplyWinter: true });
    mockUsePrefersReducedMotion.mockReturnValue(false);

    const { queryByTestId } = render(<WinterSnowfall />);

    expect(queryByTestId('snowfall')).toBeInTheDocument();
  });

  it('does not snow when the user has asked to reduce motion', () => {
    mockUseSeasonalTheme.mockReturnValue({ shouldApplyWinter: true });
    mockUsePrefersReducedMotion.mockReturnValue(true);

    const { queryByTestId } = render(<WinterSnowfall />);

    expect(queryByTestId('snowfall')).not.toBeInTheDocument();
  });

  it('does not snow when the winter theme is off', () => {
    mockUseSeasonalTheme.mockReturnValue({ shouldApplyWinter: false });
    mockUsePrefersReducedMotion.mockReturnValue(false);

    const { queryByTestId } = render(<WinterSnowfall />);

    expect(queryByTestId('snowfall')).not.toBeInTheDocument();
  });
});

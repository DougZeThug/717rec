import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockTheme, mockSeasonal, mockIsMobile } = vi.hoisted(() => ({
  mockTheme: vi.fn(),
  mockSeasonal: vi.fn(),
  mockIsMobile: vi.fn(),
}));

vi.mock('@/hooks/useThemeConsistency', () => ({ useThemeConsistency: () => mockTheme() }));
vi.mock('@/hooks/useSeasonalTheme', () => ({ useSeasonalTheme: () => mockSeasonal() }));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockIsMobile() }));
vi.mock('@/components/effects/WinterSnowfall', () => ({ WinterSnowfall: () => null }));

import PageLayout from '../PageLayout';

const seasonal = (overrides: Record<string, unknown> = {}) => ({
  shouldApplyWinter: false,
  shouldApplyWinterBase: false,
  isWinterTheme: false,
  winterClass: '',
  ...overrides,
});

/** The text sits in the content wrapper, whose parent is the outer box. */
const shell = () => screen.getByText('page body').parentElement as HTMLElement;

describe('PageLayout', () => {
  beforeEach(() => {
    mockTheme.mockReturnValue({ isDark: false });
    mockSeasonal.mockReturnValue(seasonal());
    mockIsMobile.mockReturnValue(false);
  });

  it('puts the page content in a plain wrapper', () => {
    render(<PageLayout>page body</PageLayout>);

    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('uses the winter background and ice pattern on every page when winter is on', () => {
    mockSeasonal.mockReturnValue(
      seasonal({ shouldApplyWinterBase: true, isWinterTheme: true, winterClass: 'winter-frozen' })
    );
    render(<PageLayout>page body</PageLayout>);

    expect(shell()).toHaveClass('page-winter-bg', 'ice-pattern-bg', 'winter-frozen');
  });

  it('adds the full winter pattern only where it is asked for', () => {
    mockSeasonal.mockReturnValue(
      seasonal({ shouldApplyWinter: true, shouldApplyWinterBase: true, isWinterTheme: true })
    );
    render(<PageLayout>page body</PageLayout>);

    expect(shell()).toHaveClass('winter-pattern');
  });

  it('draws no background gradient when the page opts out', () => {
    render(<PageLayout withBackground={false}>page body</PageLayout>);

    expect(shell().className).not.toMatch(/bg-gradient|cornhole-bg/);
    expect(shell()).not.toHaveStyle({ background: '#f8f8f8' });
  });

  it.each([
    [false, 'from-blue-50'],
    [true, 'from-gray-900'],
  ])('uses a blue gradient for the blue variant (dark: %s)', (isDark, expected) => {
    mockTheme.mockReturnValue({ isDark });
    render(<PageLayout gradientVariant="blue">page body</PageLayout>);

    expect(shell()).toHaveClass(expected);
  });

  it('falls back to the cornhole background for the default variant', () => {
    render(<PageLayout gradientVariant="default">page body</PageLayout>);

    expect(shell()).toHaveClass('cornhole-bg');
  });

  it('uses tighter padding on a phone', () => {
    mockIsMobile.mockReturnValue(true);
    render(<PageLayout>page body</PageLayout>);

    expect(shell()).toHaveClass('py-3');
  });
});

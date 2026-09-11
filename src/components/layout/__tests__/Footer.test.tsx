import { render, screen } from '@testing-library/react';
import { useTheme } from 'next-themes';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Footer from '@/components/layout/Footer';

vi.mock('next-themes', () => ({ useTheme: vi.fn() }));

const mockedUseTheme = vi.mocked(useTheme);

/** Only `theme` is read, through `useSeasonalTheme`. */
const withTheme = (theme: string) =>
  mockedUseTheme.mockReturnValue({ theme } as unknown as ReturnType<typeof useTheme>);

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );

describe('Footer', () => {
  beforeEach(() => {
    withTheme('dark');
  });

  it('shows the logo, both ways to make contact, and the copyright', () => {
    renderFooter();

    expect(screen.getByAltText('717 Rec Logo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'admin@717rec.com' })).toHaveAttribute(
      'href',
      'mailto:admin@717rec.com'
    );
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
    expect(
      screen.getByText(`© ${new Date().getFullYear()} 717 Rec. All rights reserved.`)
    ).toBeInTheDocument();
  });

  it('is a contentinfo landmark', () => {
    renderFooter();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('takes its colours from tokens outside the winter theme', () => {
    renderFooter();

    // The point of L2: one class per role, no hand-written light/dark pair.
    const footer = screen.getByRole('contentinfo');
    expect(footer.className).toContain('bg-muted');
    expect(footer.className).toContain('border-border');
    expect(footer.className).not.toMatch(/\b(bg|border)-(gray|slate)-\d/);
  });

  it('swaps to the frosted surface under the winter theme', () => {
    withTheme('winter-frozen');
    renderFooter();

    const footer = screen.getByRole('contentinfo');
    expect(footer.className).toContain('winter-card-surface');
    expect(footer.className).not.toContain('bg-muted');
  });

  it('separates the two contact links for a screen reader', () => {
    renderFooter();
    // The "·" between them is decoration, not content.
    expect(screen.getByText('·')).toHaveAttribute('aria-hidden', 'true');
  });
});

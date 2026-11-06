import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), resolvedTheme: 'light' }),
}));
vi.mock('@/hooks/useThemeSettings', () => ({
  useEnabledThemeKeys: () => ({
    enabledKeys: ['light', 'dark', 'winter-frozen'],
    isLoading: false,
  }),
}));

import ThemeToggle from '../ThemeToggle';

describe('ThemeToggle', () => {
  it('is a button named Toggle theme', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
  });

  // jsdom does no layout, so this pins the class. The header passes size="sm", which made the
  // button 42px wide; every button in this app is at least 44px to tap.
  it('is at least 44px wide even at the small size', () => {
    // `default` size, so this pins the component's own class and not the small Button size's.
    render(<ThemeToggle size="default" />);

    expect(screen.getByRole('button', { name: 'Toggle theme' })).toHaveClass('min-w-[44px]');
  });
});

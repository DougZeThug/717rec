import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useThemeSettings: vi.fn(),
  mutate: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/hooks/useThemeSettings', () => ({
  useThemeSettings: mocks.useThemeSettings,
  useUpdateThemeSetting: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock('@/hooks/useToast', () => ({ toast: mocks.toast }));

import ThemeManagementTab from '../ThemeManagementTab';

afterEach(() => vi.resetAllMocks());

describe('ThemeManagementTab', () => {
  it('shows the loading state', () => {
    mocks.useThemeSettings.mockReturnValue({ isLoading: true });
    render(<ThemeManagementTab />);
    expect(screen.getByText('Loading theme settings...')).toBeInTheDocument();
  });

  it('prevents the last enabled theme from being disabled', () => {
    mocks.useThemeSettings.mockReturnValue({
      isLoading: false,
      data: [{ id: '1', theme_key: 'light', label: 'Light', is_enabled: true }],
    });
    render(<ThemeManagementTab />);
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Light theme' }));
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'At least one theme must remain enabled' })
    );
  });

  it('sends the correct update when another theme stays enabled', () => {
    mocks.useThemeSettings.mockReturnValue({
      isLoading: false,
      data: [
        { id: '1', theme_key: 'light', label: 'Light', is_enabled: true },
        { id: '2', theme_key: 'dark', label: 'Dark', is_enabled: true },
      ],
    });
    render(<ThemeManagementTab />);
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Dark theme' }));
    expect(mocks.mutate).toHaveBeenCalledWith(
      { themeKey: 'dark', isEnabled: false },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });
});

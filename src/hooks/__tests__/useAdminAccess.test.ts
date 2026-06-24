import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminAccess } from '../useAdminAccess';

const mockToast = vi.fn();

vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

vi.mock('@/utils/logger', () => ({
  authLog: vi.fn(),
  warnLog: vi.fn(),
}));

import { useAuth } from '@/contexts/auth-context';

const makeAuth = (overrides: Record<string, unknown> = {}) => ({
  user: { id: 'user-1', email: 'user@example.com' },
  profile: { is_admin: false },
  authInitialized: true,
  isProfileLoading: false,
  ...overrides,
});

describe('useAdminAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grants access when profile.is_admin=true and auth is initialized', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAuth({ profile: { is_admin: true } })
    );
    const { result } = renderHook(() => useAdminAccess());
    expect(result.current.isAdminAccessGranted).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('denies access when profile.is_admin=false', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAuth({ profile: { is_admin: false } })
    );
    const { result } = renderHook(() => useAdminAccess());
    expect(result.current.isAdminAccessGranted).toBe(false);
  });

  it('denies access when profile is null', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(makeAuth({ profile: null }));
    const { result } = renderHook(() => useAdminAccess());
    expect(result.current.isAdminAccessGranted).toBe(false);
  });

  it('denies access when user is null', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAuth({ user: null, profile: { is_admin: true } })
    );
    const { result } = renderHook(() => useAdminAccess());
    expect(result.current.isAdminAccessGranted).toBe(false);
  });

  it('shows loading and denies access when authInitialized=false', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(makeAuth({ authInitialized: false }));
    const { result } = renderHook(() => useAdminAccess());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAdminAccessGranted).toBe(false);
  });

  it('shows loading when profile is still loading', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(makeAuth({ isProfileLoading: true }));
    const { result } = renderHook(() => useAdminAccess());
    expect(result.current.isLoading).toBe(true);
  });

  it('checkAdminAccess always returns false regardless of input', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(makeAuth());
    const { result } = renderHook(() => useAdminAccess());
    expect(result.current.checkAdminAccess('secret-code')).toBe(false);
    expect(result.current.checkAdminAccess('')).toBe(false);
    expect(result.current.checkAdminAccess('admin')).toBe(false);
  });

  it('revokeAdminAccess fires a destructive toast (client-side revoke is blocked)', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(makeAuth());
    const { result } = renderHook(() => useAdminAccess());
    act(() => {
      result.current.revokeAdminAccess();
    });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});

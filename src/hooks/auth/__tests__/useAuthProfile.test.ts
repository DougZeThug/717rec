import { User } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';
import type { UserProfile } from '@/types/user';

import { useAuthProfile } from '../useAuthProfile';

const mockFetchAuthProfile = vi.fn();

vi.mock('@/services/profile/ProfileService', () => ({
  fetchAuthProfile: (...args: unknown[]) => mockFetchAuthProfile(...args),
}));

vi.mock('@/utils/logger', () => ({
  authLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
}));

const navigate = vi.fn();
const user = { id: 'user-1', email: 'admin@example.com' } as User;
const profile: UserProfile = {
  id: 'user-1',
  username: 'admin',
  full_name: 'Ada Admin',
  avatar_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
  is_admin: true,
};

const dbError = () => new DatabaseError('Failed to fetch profile: boom');

describe('useAuthProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchProfile retry', () => {
    it('returns the profile without retrying when the first read succeeds', async () => {
      mockFetchAuthProfile.mockResolvedValueOnce(profile);
      const { result } = renderHook(() => useAuthProfile(user, navigate));

      await expect(result.current.fetchProfile('user-1')).resolves.toEqual(profile);
      expect(mockFetchAuthProfile).toHaveBeenCalledTimes(1);
    });

    it('retries once and succeeds when the first read fails', async () => {
      mockFetchAuthProfile.mockRejectedValueOnce(dbError()).mockResolvedValueOnce(profile);
      const { result } = renderHook(() => useAuthProfile(user, navigate));

      await expect(result.current.fetchProfile('user-1')).resolves.toEqual(profile);
      expect(mockFetchAuthProfile).toHaveBeenCalledTimes(2);
    });

    it('throws to the caller when both attempts fail', async () => {
      mockFetchAuthProfile.mockRejectedValue(dbError());
      const { result } = renderHook(() => useAuthProfile(user, navigate));

      await expect(result.current.fetchProfile('user-1')).rejects.toBeInstanceOf(DatabaseError);
      expect(mockFetchAuthProfile).toHaveBeenCalledTimes(2);
    });

    it('passes a "no profile row" null straight through without retrying', async () => {
      // fetchAuthProfile returns null for PGRST116 — a real new user, not a failure.
      mockFetchAuthProfile.mockResolvedValueOnce(null);
      const { result } = renderHook(() => useAuthProfile(user, navigate));

      await expect(result.current.fetchProfile('user-1')).resolves.toBeNull();
      expect(mockFetchAuthProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshProfile', () => {
    it('starts with no recorded failure', () => {
      const { result } = renderHook(() => useAuthProfile(user, navigate));
      expect(result.current.profileLoadFailed).toBe(false);
    });

    it('records a failure when both attempts fail', async () => {
      mockFetchAuthProfile.mockRejectedValue(dbError());
      const { result } = renderHook(() => useAuthProfile(user, navigate));

      await act(async () => {
        await result.current.refreshProfile();
      });

      await waitFor(() => expect(result.current.profileLoadFailed).toBe(true));
      expect(result.current.isProfileLoading).toBe(false);
    });

    it('clears the failure and stores the profile on a later success', async () => {
      mockFetchAuthProfile.mockRejectedValue(dbError());
      const { result } = renderHook(() => useAuthProfile(user, navigate));

      await act(async () => {
        await result.current.refreshProfile();
      });
      await waitFor(() => expect(result.current.profileLoadFailed).toBe(true));

      mockFetchAuthProfile.mockReset();
      mockFetchAuthProfile.mockResolvedValue(profile);

      await act(async () => {
        await result.current.refreshProfile();
      });

      await waitFor(() => expect(result.current.profileLoadFailed).toBe(false));
      expect(result.current.profile).toEqual(profile);
      expect(result.current.isProfileLoading).toBe(false);
    });

    it('does nothing when there is no signed-in user', async () => {
      const { result } = renderHook(() => useAuthProfile(null, navigate));

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(mockFetchAuthProfile).not.toHaveBeenCalled();
      expect(result.current.profileLoadFailed).toBe(false);
    });
  });

  describe('checkProfileSetup', () => {
    it('sends a user with no profile to the setup page', () => {
      const { result } = renderHook(() => useAuthProfile(user, navigate));
      act(() => result.current.checkProfileSetup(null));
      expect(navigate).toHaveBeenCalledWith('/setup-profile');
    });

    it('leaves a user with a username alone', () => {
      const { result } = renderHook(() => useAuthProfile(user, navigate));
      act(() => result.current.checkProfileSetup({ ...profile, username: 'admin' }));
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});

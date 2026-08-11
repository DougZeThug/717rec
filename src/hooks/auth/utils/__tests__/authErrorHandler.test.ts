import { afterEach, describe, expect, it, vi } from 'vitest';

const { toast, errorLog } = vi.hoisted(() => ({ toast: vi.fn(), errorLog: vi.fn() }));
vi.mock('@/hooks/useToast', () => ({ toast }));
vi.mock('@/utils/logger', () => ({ errorLog }));

import { handleAuthError } from '../authErrorHandler';

afterEach(() => vi.resetAllMocks());

describe('handleAuthError', () => {
  it('sets, logs, displays, and returns the auth error', () => {
    const setError = vi.fn();
    expect(handleAuthError(new Error('Wrong password'), 'Sign in', setError)).toBe(
      'Wrong password'
    );
    expect(setError).toHaveBeenCalledWith('Wrong password');
    expect(errorLog).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: 'Sign in failed',
      description: 'Wrong password',
      variant: 'destructive',
    });
  });

  it('uses a context fallback when the error message is empty', () => {
    expect(handleAuthError(new Error(''), 'Sign out', vi.fn())).toBe(
      'An error occurred during Sign out'
    );
  });
});

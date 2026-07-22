import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: null, profile: null }),
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({ membership: null }),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

vi.mock('@/services/messages/MessageService', () => ({
  MessageService: {
    fetchMessages: vi.fn(),
    createMessage: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn(),
  },
}));

import { MessageService } from '@/services/messages/MessageService';

import { useMessageApi } from '../useMessageApi';

describe('useMessageApi.fetchMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards options and the caller-provided AbortSignal to the service', async () => {
    vi.mocked(MessageService.fetchMessages).mockResolvedValue([]);
    const { result } = renderHook(() => useMessageApi());
    const controller = new AbortController();

    await result.current.fetchMessages({ limit: 5 }, controller.signal);

    expect(MessageService.fetchMessages).toHaveBeenCalledWith({ limit: 5 }, controller.signal);
  });

  it('rejects on abort instead of resolving with an empty page', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    vi.mocked(MessageService.fetchMessages).mockRejectedValue(abortError);
    const { result } = renderHook(() => useMessageApi());

    await expect(result.current.fetchMessages({ limit: 5 })).rejects.toThrow('Aborted');
  });

  it('rejects on service failure instead of masking it', async () => {
    vi.mocked(MessageService.fetchMessages).mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useMessageApi());

    await expect(result.current.fetchMessages()).rejects.toThrow('network down');
  });
});

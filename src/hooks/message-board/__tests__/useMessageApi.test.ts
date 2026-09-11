import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { user: null, profile: null } as {
    user: { id: string } | null;
    profile: { username: string } | null;
  },
  activeMembership: null as {
    team_id: string;
    is_approved: boolean;
    team?: { name: string };
  } | null,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({ activeMembership: mocks.activeMembership }),
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
    mocks.auth = { user: null, profile: null };
    mocks.activeMembership = null;
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

describe('useMessageApi.createMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth = { user: { id: 'user-1' }, profile: { username: 'doug' } };
    mocks.activeMembership = null;
    vi.mocked(MessageService.createMessage).mockResolvedValue(undefined);
  });

  it('stamps the team on the message when the membership is approved', async () => {
    mocks.activeMembership = {
      team_id: 'team-1',
      is_approved: true,
      team: { name: 'The Bag Boys' },
    };
    const { result } = renderHook(() => useMessageApi());

    await result.current.createMessage('hello');

    expect(MessageService.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ team_id: 'team-1', team_name: 'The Bag Boys' })
    );
  });

  // The league refuses a message stamped with a team the author is not an
  // approved member of, so a pending request used to make every post fail.
  it('sends no team while the join request is still waiting for approval', async () => {
    mocks.activeMembership = {
      team_id: 'team-1',
      is_approved: false,
      team: { name: 'The Bag Boys' },
    };
    const { result } = renderHook(() => useMessageApi());

    await result.current.createMessage('hello');

    expect(MessageService.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ team_id: null, team_name: null })
    );
  });

  it('sends no team when the account is in no team at all', async () => {
    const { result } = renderHook(() => useMessageApi());

    await result.current.createMessage('hello');

    expect(MessageService.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ team_id: null, team_name: null })
    );
  });
});

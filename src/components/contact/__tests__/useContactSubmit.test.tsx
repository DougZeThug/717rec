import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CONTACT_TOPIC_OPTIONS } from '@/services/contact/contactTopics';

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  contact: vi.fn(),
  signup: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/services/contact/ContactSubmissionService', () => ({
  submitContactMessage: mocks.submit,
}));
vi.mock('@/utils/analytics', () => ({
  trackContactForm: mocks.contact,
  trackLeagueSignup: mocks.signup,
}));
vi.mock('@/hooks/useToast', () => ({ toast: mocks.toast }));

import { useContactSubmit } from '../useContactSubmit';

const draft = {
  topic: CONTACT_TOPIC_OPTIONS[2],
  name: 'Test Player',
  contact: 'test@example.com',
  team: 'Test Team',
  players: 'Test Player, Partner',
  message: 'Please register our team.',
  website: '',
  signupTracking: { source: 'join_page', signup_kind: 'team' } as const,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.submit.mockImplementation(() => Promise.resolve());
});

describe('Join conversion tracking', () => {
  it('counts a team request only after the save succeeds', async () => {
    let finish: (() => void) | undefined;
    mocks.submit.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const sent = vi.fn();
    const { result } = renderHook(() => useContactSubmit(sent));
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.submit(draft);
    });
    expect(mocks.signup).not.toHaveBeenCalled();
    await act(async () => {
      finish?.();
      await pending;
    });
    expect(mocks.signup).toHaveBeenCalledExactlyOnceWith({
      source: 'join_page',
      signup_kind: 'team',
    });
    expect(sent).toHaveBeenCalledOnce();
  });

  it('counts a solo request without personal details', async () => {
    const { result } = renderHook(() => useContactSubmit(vi.fn()));
    await act(() =>
      result.current.submit({
        ...draft,
        signupTracking: { source: 'join_page', signup_kind: 'solo' },
      })
    );
    expect(mocks.signup).toHaveBeenCalledExactlyOnceWith({
      source: 'join_page',
      signup_kind: 'solo',
    });
  });

  it('does not count a failed save', async () => {
    mocks.submit.mockRejectedValue(new Error('Offline'));
    const { result } = renderHook(() => useContactSubmit(vi.fn()));
    await act(() => result.current.submit(draft));
    expect(mocks.signup).not.toHaveBeenCalled();
  });

  it('does not count invalid input', async () => {
    const { result } = renderHook(() => useContactSubmit(vi.fn()));
    await act(() => result.current.submit({ ...draft, team: '' }));
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.signup).not.toHaveBeenCalled();
  });

  it('does not count honeypot success responses', async () => {
    const { result } = renderHook(() => useContactSubmit(vi.fn()));
    await act(() => result.current.submit({ ...draft, website: 'bot.example' }));
    expect(mocks.signup).not.toHaveBeenCalled();
    expect(mocks.contact).not.toHaveBeenCalled();
  });

  it('does not count another topic with stale Join metadata', async () => {
    const { result } = renderHook(() => useContactSubmit(vi.fn()));
    await act(() => result.current.submit({ ...draft, topic: CONTACT_TOPIC_OPTIONS[0] }));
    expect(mocks.signup).not.toHaveBeenCalled();
    expect(mocks.contact).toHaveBeenCalledWith('timeslot');
  });

  it('keeps saved requests successful when analytics throws', async () => {
    mocks.signup.mockImplementation(() => {
      throw new Error('Blocked');
    });
    const sent = vi.fn();
    const { result } = renderHook(() => useContactSubmit(sent));
    await act(() => result.current.submit(draft));
    expect(sent).toHaveBeenCalledOnce();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});

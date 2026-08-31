import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ADMIN_TAB_STORAGE_KEY,
  subscribeToAdminTabRequests,
  switchAdminTab,
} from '@/utils/adminTabs';

describe('adminTabs', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('tells a listener which tab was asked for', () => {
    const onRequest = vi.fn();
    const unsubscribe = subscribeToAdminTabRequests(onRequest);

    switchAdminTab('batch-matches');

    expect(onRequest).toHaveBeenCalledWith('batch-matches');
    unsubscribe();
  });

  it('remembers the tab so a reload reopens it', () => {
    switchAdminTab('auto-schedule');

    expect(sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY)).toBe('auto-schedule');
  });

  it('stops telling a listener once it unsubscribes', () => {
    const onRequest = vi.fn();
    const unsubscribe = subscribeToAdminTabRequests(onRequest);

    unsubscribe();
    switchAdminTab('scores');

    expect(onRequest).not.toHaveBeenCalled();
  });

  it('still asks for the tab when storage is unavailable', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    const onRequest = vi.fn();
    const unsubscribe = subscribeToAdminTabRequests(onRequest);

    expect(() => switchAdminTab('teams')).not.toThrow();
    expect(onRequest).toHaveBeenCalledWith('teams');

    unsubscribe();
    setItem.mockRestore();
  });

  it('ignores an event with no tab id', () => {
    const onRequest = vi.fn();
    const unsubscribe = subscribeToAdminTabRequests(onRequest);

    window.dispatchEvent(new CustomEvent('admin:switch-tab', { detail: '' }));

    expect(onRequest).not.toHaveBeenCalled();
    unsubscribe();
  });
});

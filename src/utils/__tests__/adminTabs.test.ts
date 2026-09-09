import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ADMIN_TAB_STORAGE_KEY,
  readRememberedAdminSection,
  rememberAdminSection,
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

  // Codex review: asking for a section is not the same as opening one. The
  // shell can refuse the switch when the section on screen holds unsaved work,
  // and recording here left the refused section as the one a bare /admin
  // reopened. The dashboard records whatever it actually renders.
  it('does not remember a tab merely because it was asked for', () => {
    switchAdminTab('auto-schedule');

    expect(sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY)).toBeNull();
  });

  it('remembers a section that was opened, so a reload reopens it', () => {
    rememberAdminSection('auto-schedule');

    expect(sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY)).toBe('auto-schedule');
    expect(readRememberedAdminSection()).toBe('auto-schedule');
  });

  it('falls back to the default when nothing usable was remembered', () => {
    expect(readRememberedAdminSection()).toBe('timeslots');

    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, 'a-section-from-an-older-build');
    expect(readRememberedAdminSection()).toBe('timeslots');
  });

  it('stops telling a listener once it unsubscribes', () => {
    const onRequest = vi.fn();
    const unsubscribe = subscribeToAdminTabRequests(onRequest);

    unsubscribe();
    switchAdminTab('scores');

    expect(onRequest).not.toHaveBeenCalled();
  });

  it('survives a browser that refuses session storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    const onRequest = vi.fn();
    const unsubscribe = subscribeToAdminTabRequests(onRequest);

    expect(() => switchAdminTab('teams')).not.toThrow();
    expect(onRequest).toHaveBeenCalledWith('teams');
    expect(() => rememberAdminSection('teams')).not.toThrow();
    expect(readRememberedAdminSection()).toBe('timeslots');

    unsubscribe();
    setItem.mockRestore();
    getItem.mockRestore();
  });

  it('ignores an event with no tab id', () => {
    const onRequest = vi.fn();
    const unsubscribe = subscribeToAdminTabRequests(onRequest);

    // The literal is deliberate: it pins the event name, which is private to
    // the module and would otherwise be free to drift.
    window.dispatchEvent(new CustomEvent('admin:switch-tab', { detail: '' }));

    expect(onRequest).not.toHaveBeenCalled();
    unsubscribe();
  });
});

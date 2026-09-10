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

    expect(onRequest.mock.calls[0]).toEqual(['batch-matches', undefined]);
    unsubscribe();
  });

  // One section hands the next one what to open on: the Requests approval toast
  // sends Timeslots the night, the team and the block. It travels in the
  // address, so the receiving section can be reloaded and stepped back to.
  it('passes a query string through to the listener', () => {
    const onRequest = vi.fn();
    const unsubscribe = subscribeToAdminTabRequests(onRequest);

    switchAdminTab('timeslots', '?date=2026-09-17&team=t1&slot=7%3A00+PM');

    expect(onRequest).toHaveBeenCalledWith('timeslots', '?date=2026-09-17&team=t1&slot=7%3A00+PM');
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
    expect(onRequest.mock.calls[0]).toEqual(['teams', undefined]);
    expect(() => rememberAdminSection('teams')).not.toThrow();
    expect(readRememberedAdminSection()).toBe('timeslots');

    unsubscribe();
    setItem.mockRestore();
    getItem.mockRestore();
  });

  it('ignores an event with no tab id', () => {
    const onRequest = vi.fn();
    const unsubscribe = subscribeToAdminTabRequests(onRequest);

    // The literals are deliberate: they pin the event name and the payload
    // shape, both private to the module and otherwise free to drift.
    window.dispatchEvent(new CustomEvent('admin:switch-tab', { detail: { tabId: '' } }));
    window.dispatchEvent(new CustomEvent('admin:switch-tab', { detail: undefined }));

    expect(onRequest).not.toHaveBeenCalled();
    unsubscribe();
  });
});

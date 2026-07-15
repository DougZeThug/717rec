import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  initAnalytics,
  setAnalyticsUser,
  trackAuth,
  trackBracketView,
  trackContactForm,
  trackEvent,
  trackPageView,
  trackScoreSubmission,
  trackTeamView,
} from '../analytics';

describe('analytics (dev mode short-circuit)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Ensure no real gtag exists to prove short-circuit path is taken
    (window as unknown as { gtag?: unknown }).gtag = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('initAnalytics logs "Disabled" and does not inject a script in dev/test', () => {
    const before = document.querySelectorAll('script[src*="googletagmanager"]').length;
    initAnalytics();
    const after = document.querySelectorAll('script[src*="googletagmanager"]').length;
    expect(after).toBe(before);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[Analytics] Disabled'));
  });

  it('trackPageView logs without calling gtag', () => {
    trackPageView('/teams', 'Teams');
    expect(logSpy).toHaveBeenCalledWith('[Analytics] Page view:', '/teams', 'Teams');
  });

  it('trackEvent logs without calling gtag', () => {
    trackEvent('my_event', { foo: 'bar' });
    expect(logSpy).toHaveBeenCalledWith('[Analytics] Event:', 'my_event', { foo: 'bar' });
  });

  it('setAnalyticsUser logs the user id', () => {
    setAnalyticsUser('user-123');
    expect(logSpy).toHaveBeenCalledWith('[Analytics] Set user:', 'user-123');
  });

  it('pre-defined event helpers delegate to trackEvent (logging path)', () => {
    trackAuth('login');
    trackScoreSubmission('m-1');
    trackBracketView('b-1', 'Main');
    trackTeamView('t-1', 'Sharks');
    trackContactForm('Hello');

    expect(logSpy).toHaveBeenCalledWith('[Analytics] Event:', 'auth', { action: 'login' });
    expect(logSpy).toHaveBeenCalledWith('[Analytics] Event:', 'score_submission', {
      match_id: 'm-1',
    });
    expect(logSpy).toHaveBeenCalledWith('[Analytics] Event:', 'bracket_view', {
      bracket_id: 'b-1',
      bracket_title: 'Main',
    });
    expect(logSpy).toHaveBeenCalledWith('[Analytics] Event:', 'team_view', {
      team_id: 't-1',
      team_name: 'Sharks',
    });
    expect(logSpy).toHaveBeenCalledWith('[Analytics] Event:', 'contact_form_submit', {
      subject: 'Hello',
    });
  });
});

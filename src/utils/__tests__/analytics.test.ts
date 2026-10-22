import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('League signup analytics', () => {
  it('queues the first successful request before gtag loads, without personal fields', async () => {
    vi.resetModules();
    vi.stubEnv('PROD', true);
    window.dataLayer = [];
    const { trackLeagueSignup } = await import('../analytics');
    trackLeagueSignup({ source: 'join_page', signup_kind: 'solo' });
    expect(window.dataLayer).toContainEqual([
      'event',
      'join_league_signup',
      { source: 'join_page', signup_kind: 'solo', transport_type: 'beacon' },
    ]);
  });

  it('does not send conversions from a development preview', async () => {
    vi.stubEnv('PROD', false);
    const send = vi.fn();
    window.gtag = send;
    const { trackLeagueSignup } = await import('../analytics');
    trackLeagueSignup({ source: 'join_page', signup_kind: 'team' });
    expect(send).not.toHaveBeenCalled();
  });
});

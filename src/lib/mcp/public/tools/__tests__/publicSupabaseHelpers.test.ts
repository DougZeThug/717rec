import { createClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { anonClient, getActiveSeasonId } from '../_supabase';

// publishableKey is private, so the key it picked is read off the createClient
// call. Only the constructor is stubbed; the whole resolution order runs.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({}) as unknown),
}));

/**
 * This project's publishable key is the legacy Supabase signed JWT, the same
 * shape as the fallback in src/integrations/supabase/client.ts. It is not an
 * `sb_publishable_` key, which is the newer namespace this project does not use.
 */
const JWT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl';

const KEY_VARS = [
  'SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_PUBLISHABLE_KEYS',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
];

/** The key handed to createClient on the most recent anonClient() call. */
const keyUsed = (): string => vi.mocked(createClient).mock.calls.at(-1)?.[1] as string;

describe('publishable key resolution for the public MCP server', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    for (const name of [...KEY_VARS, 'SUPABASE_URL']) {
      saved[name] = process.env[name];
      Reflect.deleteProperty(process.env, name);
    }
    process.env.SUPABASE_URL = 'https://example.supabase.co';
  });

  afterEach(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) Reflect.deleteProperty(process.env, name);
      else process.env[name] = value;
    }
  });

  /**
   * The regression. A prefix test on the keyset accepted only
   * `sb_publishable_` keys, so a deployer who put this project's real key in
   * SUPABASE_PUBLISHABLE_KEYS got a misleading "is required" error.
   */
  it('accepts the JWT key this project actually uses from the keyset', () => {
    process.env.SUPABASE_PUBLISHABLE_KEYS = JSON.stringify({ default: JWT_KEY });

    expect(() => anonClient()).not.toThrow();
    expect(keyUsed()).toBe(JWT_KEY);
  });

  /**
   * Worse than the error: with a legacy key also set, the keyset was discarded
   * in silence and the key the operator was retiring kept authenticating every
   * public read.
   */
  it('prefers the keyset over a legacy anon key', () => {
    process.env.SUPABASE_PUBLISHABLE_KEYS = JSON.stringify({ default: JWT_KEY });
    process.env.SUPABASE_ANON_KEY = 'legacy-anon-key-do-not-use';

    anonClient();

    expect(keyUsed()).toBe(JWT_KEY);
  });

  it('accepts an sb_publishable_ key from the keyset too', () => {
    process.env.SUPABASE_PUBLISHABLE_KEYS = JSON.stringify({ default: 'sb_publishable_abc123' });

    anonClient();

    expect(keyUsed()).toBe('sb_publishable_abc123');
  });

  it('skips blank keyset entries and takes the next usable one', () => {
    process.env.SUPABASE_PUBLISHABLE_KEYS = JSON.stringify({ default: '   ', staging: JWT_KEY });

    anonClient();

    expect(keyUsed()).toBe(JWT_KEY);
  });

  it('still prefers a directly named key over the keyset', () => {
    process.env.SUPABASE_PUBLISHABLE_KEY = 'direct-key';
    process.env.SUPABASE_PUBLISHABLE_KEYS = JSON.stringify({ default: JWT_KEY });

    anonClient();

    expect(keyUsed()).toBe('direct-key');
  });

  it('falls back to the legacy key when the keyset is malformed', () => {
    process.env.SUPABASE_PUBLISHABLE_KEYS = '{not json';
    process.env.SUPABASE_ANON_KEY = 'legacy-anon-key';

    anonClient();

    expect(keyUsed()).toBe('legacy-anon-key');
  });

  it('reports what is missing when nothing is configured', () => {
    expect(() => anonClient()).toThrow(
      /SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEYS, or SUPABASE_ANON_KEY is required/
    );
  });
});

/**
 * Every public MCP tool starts by resolving the active season through this, so
 * a season lookup that fails quietly would empty every answer they give.
 */
describe('getActiveSeasonId', () => {
  const clientReturning = (result: { data: unknown; error: unknown }) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => Promise.resolve(result),
    };
    return { from: () => builder } as unknown as Parameters<typeof getActiveSeasonId>[0];
  };

  it('returns the id of the active season', async () => {
    const result = await getActiveSeasonId(
      clientReturning({ data: { id: 'season-1' }, error: null })
    );

    expect(result).toEqual({ data: 'season-1', error: null });
  });

  it('passes the database message back rather than swallowing it', async () => {
    const result = await getActiveSeasonId(
      clientReturning({ data: null, error: { message: 'seasons unavailable' } })
    );

    expect(result).toEqual({ data: null, error: 'seasons unavailable' });
  });

  it('reports no season rather than an error when none is active', async () => {
    // maybeSingle gives null for no rows, which is a league between seasons --
    // not a failure. The tools turn this into an empty answer.
    const result = await getActiveSeasonId(clientReturning({ data: null, error: null }));

    expect(result).toEqual({ data: null, error: null });
  });
});

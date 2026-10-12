import type { ToolContext } from '@lovable.dev/mcp-js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getActiveSeasonId, isHiddenTeamRow, requireAdmin, userClient } from '../_supabase';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ marker: 'user-scoped-client' })),
}));

type QueryResult = { data: unknown; error: { message: string } | null };

/** A client whose `from().select().eq().maybeSingle()` chain answers with `result`. */
const clientAnswering = (result: QueryResult) => {
  const maybeSingle = vi.fn(() => Promise.resolve(result));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient, from, select, eq };
};

const ctx = { getToken: () => 'oauth-token' } as unknown as ToolContext;

describe('userClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds a client that sends the caller token so row-level security runs as that user', () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');

    const client = userClient(ctx);

    expect(client).toEqual({ marker: 'user-scoped-client' });
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'publishable-key', {
      global: { headers: { Authorization: 'Bearer oauth-token' } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('falls back to the anon key when no publishable key is set', () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', undefined);
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');

    userClient(ctx);

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.any(Object)
    );
  });

  it('refuses to build a client when the project URL is missing', () => {
    vi.stubEnv('SUPABASE_URL', undefined);
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    expect(() => userClient(ctx)).toThrow(/SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('refuses to build a client when no key is set', () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', undefined);
    vi.stubEnv('SUPABASE_ANON_KEY', undefined);

    expect(() => userClient(ctx)).toThrow(/must be set/);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  it('says no without asking the database when there is no signed-in user', async () => {
    const { client, from } = clientAnswering({ data: { is_admin: true }, error: null });

    await expect(requireAdmin(client, undefined)).resolves.toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it('says yes for a profile flagged as admin', async () => {
    const { client, from, select, eq } = clientAnswering({
      data: { is_admin: true },
      error: null,
    });

    await expect(requireAdmin(client, 'user-1')).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('is_admin');
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it.each([
    ['a regular player', { is_admin: false }],
    ['a profile with no flag', { is_admin: null }],
    ['a missing profile', null],
  ])('says no for %s', async (_label, data) => {
    const { client } = clientAnswering({ data, error: null });

    await expect(requireAdmin(client, 'user-1')).resolves.toBe(false);
  });

  it('says no when the lookup fails, rather than letting the caller through', async () => {
    const { client } = clientAnswering({ data: { is_admin: true }, error: { message: 'boom' } });

    await expect(requireAdmin(client, 'user-1')).resolves.toBe(false);
  });
});

describe('getActiveSeasonId', () => {
  it('returns the id of the active season', async () => {
    const { client, from, select, eq } = clientAnswering({ data: { id: 'season-9' }, error: null });

    await expect(getActiveSeasonId(client)).resolves.toEqual({ data: 'season-9', error: null });
    expect(from).toHaveBeenCalledWith('seasons');
    expect(select).toHaveBeenCalledWith('id');
    expect(eq).toHaveBeenCalledWith('is_active', true);
  });

  it('returns null, with no error, when no season is active', async () => {
    const { client } = clientAnswering({ data: null, error: null });

    await expect(getActiveSeasonId(client)).resolves.toEqual({ data: null, error: null });
  });

  it('passes the database error message back instead of an id', async () => {
    const { client } = clientAnswering({ data: null, error: { message: 'permission denied' } });

    await expect(getActiveSeasonId(client)).resolves.toEqual({
      data: null,
      error: 'permission denied',
    });
  });
});

describe('isHiddenTeamRow without a division join', () => {
  it('falls back to the cached division label for a Hidden team', () => {
    expect(isHiddenTeamRow('Hidden', undefined)).toBe(true);
    expect(isHiddenTeamRow('Hidden2', null)).toBe(true);
  });

  it('keeps a team with an ordinary cached division visible', () => {
    expect(isHiddenTeamRow('Intermediate High', undefined)).toBe(false);
  });

  it('keeps a team with no division information visible', () => {
    expect(isHiddenTeamRow(null, undefined)).toBe(false);
  });

  it('falls back to the cached label when the embedded team has no division', () => {
    expect(isHiddenTeamRow('Hidden', { divisions: null })).toBe(true);
    expect(isHiddenTeamRow('Intermediate High', { divisions: [] })).toBe(false);
  });
});

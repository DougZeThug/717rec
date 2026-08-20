import { describe, expect, it } from 'vitest';

import { getApprovedTeamId } from '../_supabase';

type Rows = { team_id: string }[];

const client = (rows: Rows, error: { message: string } | null = null) =>
  ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => Promise.resolve({ data: rows, error }),
          }),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

describe('getApprovedTeamId', () => {
  it('returns the single approved membership', async () => {
    const result = await getApprovedTeamId(client([{ team_id: 'team-1' }]), 'user-1');
    expect(result).toEqual({ data: { team_id: 'team-1' }, error: null });
  });

  it('returns null when the user has no approved membership', async () => {
    const result = await getApprovedTeamId(client([]), 'user-1');
    expect(result).toEqual({ data: null, error: null });
  });

  it('fails loudly when the user has multiple approved memberships', async () => {
    const result = await getApprovedTeamId(
      client([{ team_id: 'team-1' }, { team_id: 'team-2' }]),
      'user-1'
    );
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/Multiple approved team memberships/i);
  });

  it('surfaces database errors', async () => {
    const result = await getApprovedTeamId(client([], { message: 'boom' }), 'user-1');
    expect(result).toEqual({ data: null, error: 'boom' });
  });

  it('rejects a missing user id', async () => {
    const result = await getApprovedTeamId(client([]), undefined);
    expect(result.error).toBe('Not authenticated');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

const { fetchSeasonBreakdown } = vi.hoisted(() => ({ fetchSeasonBreakdown: vi.fn() }));
vi.mock('@/services/TeamStatsService', () => ({ fetchSeasonBreakdown }));

import { fetchTeamSeasonBreakdown } from '../fetchTeamSeasonBreakdown';

afterEach(() => vi.resetAllMocks());

describe('fetchTeamSeasonBreakdown', () => {
  it('delegates the team id and returns service data', async () => {
    fetchSeasonBreakdown.mockResolvedValue({ team_id: 'team-1' });
    await expect(fetchTeamSeasonBreakdown('team-1')).resolves.toEqual({ team_id: 'team-1' });
    expect(fetchSeasonBreakdown).toHaveBeenCalledWith('team-1');
  });

  it('returns null from an empty service response', async () => {
    fetchSeasonBreakdown.mockResolvedValue(null);
    await expect(fetchTeamSeasonBreakdown('missing')).resolves.toBeNull();
  });
});

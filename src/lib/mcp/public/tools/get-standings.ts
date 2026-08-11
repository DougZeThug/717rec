import { defineTool } from '@lovable.dev/mcp-js';
import { z } from 'zod';

import {
  anonClient,
  errorResult,
  getActiveSeasonId,
  isHiddenDivision,
  textResult,
} from './_supabase';

export default defineTool({
  name: 'get_standings',
  title: 'Get standings',
  description:
    'Get current active-season standings sorted by power score. Optional division filter. Public data, no login required.',
  inputSchema: {
    division: z.string().optional().describe('Optional division filter.'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ division }) => {
    const supabase = anonClient();
    const seasonId = await getActiveSeasonId(supabase);
    if (!seasonId) return textResult([]);

    let query = supabase
      .from('team_season_stats')
      .select(
        'team_id, division_name, match_wins, match_losses, game_wins, game_losses, power_score, playoff_rank, teams(name)'
      )
      .eq('season_id', seasonId);
    if (division) query = query.ilike('division_name', division);
    const { data, error } = await query.order('power_score', {
      ascending: false,
      nullsFirst: false,
    });
    if (error) return errorResult(error.message);

    // Filter before ranking, so ranks stay contiguous.
    const rows = (data ?? [])
      .filter((row) => !isHiddenDivision(row.division_name))
      .map((row, index) => {
        const { teams, ...rest } = row as typeof row & { teams?: { name?: string } | null };
        return { rank: index + 1, team_name: teams?.name ?? null, ...rest };
      });
    return textResult(rows);
  },
});

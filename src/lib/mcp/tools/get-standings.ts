import { defineTool } from '@lovable.dev/mcp-js';
import { z } from 'zod';

import {
  errorResult,
  getActiveSeasonId,
  isHiddenTeamRow,
  textResult,
  userClient,
} from './_supabase';

export default defineTool({
  name: 'get_standings',
  title: 'Get standings',
  description:
    'Get current active-season standings sorted by power score. Optional division filter.',
  inputSchema: {
    division: z.string().optional().describe('Optional division filter.'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ division }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult('Not authenticated');
    const supabase = userClient(ctx);
    const seasonId = await getActiveSeasonId(supabase);
    if (!seasonId) return textResult([]);

    let query = supabase
      .from('team_season_stats')
      .select(
        'team_id, division_name, match_wins, match_losses, game_wins, game_losses, power_score, playoff_rank, teams(name, divisions(name, display_division))'
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
      .filter((row) => !isHiddenTeamRow(row.division_name, row.teams))
      .map((row, index) => {
        const { teams, ...rest } = row as typeof row & { teams?: { name?: string } | null };
        return { rank: index + 1, team_name: teams?.name ?? null, ...rest };
      });
    return textResult(rows);
  },
});

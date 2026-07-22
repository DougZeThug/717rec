import { defineTool } from '@lovable.dev/mcp-js';
import { z } from 'zod';

import { errorResult, getActiveSeasonId, textResult, userClient } from './_supabase';

export default defineTool({
  name: 'get_standings',
  title: 'Get standings',
  description: 'Get current active-season standings sorted by rank. Optional division filter.',
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
        'team_id, team_name, division_name, wins, losses, ties, game_wins, game_losses, power_score, current_rank'
      )
      .eq('season_id', seasonId);
    if (division) query = query.ilike('division_name', division);
    const { data, error } = await query.order('current_rank', {
      ascending: true,
      nullsFirst: false,
    });
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});

import { defineTool } from '@lovable.dev/mcp-js';
import { z } from 'zod';

import { errorResult, getActiveSeasonId, textResult, userClient } from './_supabase';

export default defineTool({
  name: 'get_schedule',
  title: 'Get schedule',
  description:
    'Get scheduled or recent matches for the active season. Filter by team id and by upcoming vs recent.',
  inputSchema: {
    scope: z.enum(['upcoming', 'recent', 'all']).default('upcoming'),
    teamId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ scope, teamId, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult('Not authenticated');
    const supabase = userClient(ctx);
    const { data: seasonId, error: seasonError } = await getActiveSeasonId(supabase);
    if (seasonError) return errorResult(seasonError);
    if (!seasonId) return textResult([]);

    let query = supabase
      .from('matches')
      .select(
        `id, date, team1_id, team2_id, team1_score, team2_score, iscompleted,
         team1:teams!matches_team1_id_fkey(id, name, division:divisions(name)),
         team2:teams!matches_team2_id_fkey(id, name, division:divisions(name))`
      )
      .eq('season_id', seasonId)
      .limit(limit);

    if (teamId) query = query.or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`);
    if (scope === 'upcoming')
      query = query.eq('iscompleted', false).order('date', { ascending: true });
    else if (scope === 'recent')
      query = query.eq('iscompleted', true).order('date', { ascending: false });
    else query = query.order('date', { ascending: false });

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});

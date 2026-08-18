import { defineTool } from '@lovable.dev/mcp-js';
import { z } from 'zod';

import { errorResult, getActiveSeasonId, textResult, userClient } from './_supabase';

export default defineTool({
  name: 'get_my_recent_matches',
  title: 'Get my recent matches',
  description:
    "List recently completed matches for the signed-in user's team in the active season.",
  inputSchema: { limit: z.number().int().min(1).max(50).default(10) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult('Not authenticated');
    const supabase = userClient(ctx);
    const { data: seasonId, error: seasonError } = await getActiveSeasonId(supabase);
    if (seasonError) return errorResult(seasonError);
    if (!seasonId) return textResult([]);


    const { data: mem, error: memErr } = await supabase
      .from('team_memberships')
      .select('team_id')
      .eq('user_id', ctx.getUserId())
      .eq('is_approved', true)
      .maybeSingle();
    if (memErr) return errorResult(memErr.message);
    if (!mem?.team_id) return textResult([]);

    const { data, error } = await supabase
      .from('matches')
      .select(
        `id, date, team1_id, team2_id, team1_score, team2_score,
         team1:teams!matches_team1_id_fkey(id, name, division:divisions(name)),
         team2:teams!matches_team2_id_fkey(id, name, division:divisions(name))`
      )
      .eq('season_id', seasonId)
      .eq('iscompleted', true)
      .or(`team1_id.eq.${mem.team_id},team2_id.eq.${mem.team_id}`)
      .order('date', { ascending: false })
      .limit(limit);
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});

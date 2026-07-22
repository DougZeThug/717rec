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
    const seasonId = await getActiveSeasonId(supabase);
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
      .select('id, match_date, team1_name, team2_name, team1_score, team2_score, division_name')
      .eq('season_id', seasonId)
      .eq('is_completed', true)
      .or(`team1_id.eq.${mem.team_id},team2_id.eq.${mem.team_id}`)
      .order('match_date', { ascending: false })
      .limit(limit);
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});

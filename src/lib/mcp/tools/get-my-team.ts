import { defineTool } from '@lovable.dev/mcp-js';

import {
  errorResult,
  getActiveSeasonId,
  getApprovedTeamId,
  textResult,
  userClient,
} from './_supabase';

export default defineTool({
  name: 'get_my_team',
  title: 'Get my team',
  description: 'Get the team the signed-in user belongs to in the active season, with roster.',
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult('Not authenticated');
    const supabase = userClient(ctx);
    const { data: seasonId, error: seasonError } = await getActiveSeasonId(supabase);
    if (seasonError) return errorResult(seasonError);
    if (!seasonId) return textResult(null);

    const { data: membership, error: memErr } = await getApprovedTeamId<{
      team_id: string;
      teams: unknown;
    }>(supabase, ctx.getUserId(), 'team_id, teams(id, name, wins, losses, division:divisions(name))');
    if (memErr) return errorResult(memErr);
    if (!membership) return textResult(null);

    const { data: roster, error: rosterErr } = await supabase
      .from('team_players')
      .select('id, display_name, profile_id')
      .eq('team_id', membership.team_id);
    if (rosterErr) return errorResult(rosterErr.message);

    const { data: seasonStats, error: statsError } = await supabase
      .from('team_season_stats')
      .select('power_score, sos, division_name, match_wins, match_losses, game_wins, game_losses')
      .eq('season_id', seasonId)
      .eq('team_id', membership.team_id)
      .maybeSingle();
    if (statsError) return errorResult(statsError.message);

    return textResult({
      team: membership.teams,
      season_stats: seasonStats ?? null,
      roster: roster ?? [],
    });
  },
});

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
  name: 'list_teams',
  title: 'List teams',
  description:
    'List teams in the active season for 717rec. Optionally filter by division (Competitive, Intermediate, Recreational).',
  inputSchema: {
    division: z.string().optional().describe('Optional division name filter (case-insensitive).'),
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
        'team_id, division_name, match_wins, match_losses, power_score, teams(name, divisions(name, display_division))'
      )
      .eq('season_id', seasonId);
    if (division) query = query.ilike('division_name', division);
    const { data, error } = await query.order('power_score', {
      ascending: false,
      nullsFirst: false,
    });
    if (error) return errorResult(error.message);

    const rows = (data ?? [])
      .filter((row) => !isHiddenTeamRow(row.division_name, row.teams))
      .map((row) => {
        const { teams, ...rest } = row as typeof row & { teams?: { name?: string } | null };
        return { team_name: teams?.name ?? null, ...rest };
      });
    return textResult(rows);
  },
});

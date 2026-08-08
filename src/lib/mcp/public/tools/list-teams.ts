import { defineTool } from '@lovable.dev/mcp-js';
import { z } from 'zod';

import { anonClient, errorResult, getActiveSeasonId, textResult } from './_supabase';

export default defineTool({
  name: 'list_teams',
  title: 'List teams',
  description:
    'List teams in the active 717rec season. Optionally filter by division (Competitive, Intermediate, Recreational). Public data, no login required.',
  inputSchema: {
    division: z.string().optional().describe('Optional division name filter (case-insensitive).'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ division }) => {
    const supabase = anonClient();
    const seasonId = await getActiveSeasonId(supabase);
    if (!seasonId) return textResult([]);

    let query = supabase
      .from('team_season_stats')
      .select('team_id, division_name, match_wins, match_losses, power_score, teams(name)')
      .eq('season_id', seasonId);
    if (division) query = query.ilike('division_name', division);
    const { data, error } = await query.order('power_score', {
      ascending: false,
      nullsFirst: false,
    });
    if (error) return errorResult(error.message);

    const rows = (data ?? []).map((row) => {
      const { teams, ...rest } = row as typeof row & { teams?: { name?: string } | null };
      return { team_name: teams?.name ?? null, ...rest };
    });
    return textResult(rows);
  },
});

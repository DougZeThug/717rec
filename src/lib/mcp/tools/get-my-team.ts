import { defineTool } from "@lovable.dev/mcp-js";

import { errorResult, getActiveSeasonId, textResult, userClient } from "./_supabase";

export default defineTool({
  name: "get_my_team",
  title: "Get my team",
  description: "Get the team the signed-in user belongs to in the active season, with roster.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = userClient(ctx);
    const seasonId = await getActiveSeasonId(supabase);
    if (!seasonId) return textResult(null);

    const { data: membership, error: memErr } = await supabase
      .from("team_memberships")
      .select("team_id, teams(id, name, division_name, wins, losses, power_score)")
      .eq("user_id", ctx.getUserId())
      .eq("season_id", seasonId)
      .eq("status", "approved")
      .maybeSingle();
    if (memErr) return errorResult(memErr.message);
    if (!membership) return textResult(null);

    const { data: roster } = await supabase
      .from("team_players")
      .select("id, player_name, profile_id")
      .eq("team_id", membership.team_id);

    return textResult({ team: membership.teams, roster: roster ?? [] });
  },
});
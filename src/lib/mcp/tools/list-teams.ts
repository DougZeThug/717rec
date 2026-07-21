import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, getActiveSeasonId, textResult, userClient } from "./_supabase";

export default defineTool({
  name: "list_teams",
  title: "List teams",
  description:
    "List teams in the active season for 717rec. Optionally filter by division (Competitive, Intermediate, Recreational).",
  inputSchema: {
    division: z
      .string()
      .optional()
      .describe("Optional division name filter (case-insensitive)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ division }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = userClient(ctx);
    const seasonId = await getActiveSeasonId(supabase);
    if (!seasonId) return textResult([]);

    let query = supabase
      .from("team_season_stats")
      .select("team_id, team_name, division_name, wins, losses, power_score")
      .eq("season_id", seasonId);
    if (division) query = query.ilike("division_name", division);
    const { data, error } = await query.order("power_score", { ascending: false, nullsFirst: false });
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});
import { defineTool } from "@lovable.dev/mcp-js";

import { errorResult, requireAdmin, textResult, userClient } from "./_supabase";

export default defineTool({
  name: "reconcile_counter_drift",
  title: "Reconcile counter drift (admin)",
  description: "Admin only. Recompute team win/loss/game counters from match history and refresh season stats.",
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = userClient(ctx);
    if (!(await requireAdmin(supabase, ctx.getUserId()))) return errorResult("Admin access required");
    const { data, error } = await supabase.rpc("reconcile_team_counters");
    if (error) return errorResult(error.message);
    return textResult({ reconciled: true, result: data });
  },
});
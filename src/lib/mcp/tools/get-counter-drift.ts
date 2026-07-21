import { defineTool } from "@lovable.dev/mcp-js";

import { errorResult, requireAdmin, textResult, userClient } from "./_supabase";

export default defineTool({
  name: "get_counter_drift",
  title: "Get counter drift (admin)",
  description: "Admin only. List teams whose denormalized win/loss/game counters differ from the recomputed values.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = userClient(ctx);
    if (!(await requireAdmin(supabase, ctx.getUserId()))) return errorResult("Admin access required");
    const { data, error } = await supabase.from("v_counter_drift").select("*");
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});
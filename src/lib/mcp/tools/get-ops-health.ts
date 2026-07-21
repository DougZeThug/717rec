import { defineTool } from "@lovable.dev/mcp-js";

import { errorResult, requireAdmin, textResult, userClient } from "./_supabase";

export default defineTool({
  name: "get_ops_health",
  title: "Get ops health (admin)",
  description: "Admin only. Pending score submissions, pending team requests, last power snapshot time.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = userClient(ctx);
    if (!(await requireAdmin(supabase, ctx.getUserId()))) return errorResult("Admin access required");

    const [pending, requests, snap] = await Promise.all([
      supabase.from("score_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("team_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("power_score_snapshots")
        .select("captured_at")
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return textResult({
      pending_score_submissions: pending.count ?? 0,
      pending_team_requests: requests.count ?? 0,
      last_power_snapshot_at: snap.data?.captured_at ?? null,
    });
  },
});
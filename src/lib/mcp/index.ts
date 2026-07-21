import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listTeamsTool from "./tools/list-teams";
import getStandingsTool from "./tools/get-standings";
import getScheduleTool from "./tools/get-schedule";
import getMyUpcomingMatchesTool from "./tools/get-my-upcoming-matches";
import getMyRecentMatchesTool from "./tools/get-my-recent-matches";
import getMyTeamTool from "./tools/get-my-team";
import getCounterDriftTool from "./tools/get-counter-drift";
import reconcileCounterDriftTool from "./tools/reconcile-counter-drift";
import getOpsHealthTool from "./tools/get-ops-health";

// The OAuth issuer MUST be the direct Supabase host. Build it from the project
// ref (Vite inlines this at build time, keeping the entry import-safe). The
// fallback keeps the issuer well-formed during the throwaway manifest-extract
// eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "717rec-mcp",
  title: "717rec League",
  version: "0.1.0",
  instructions:
    "Tools for the 717rec cornhole league. Read standings, schedule, teams, and the signed-in user's team and matches. Admin users additionally get ops-health and counter-drift tools.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listTeamsTool,
    getStandingsTool,
    getScheduleTool,
    getMyTeamTool,
    getMyUpcomingMatchesTool,
    getMyRecentMatchesTool,
    getCounterDriftTool,
    reconcileCounterDriftTool,
    getOpsHealthTool,
  ],
});
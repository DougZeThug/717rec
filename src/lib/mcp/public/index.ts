import { defineMcp } from '@lovable.dev/mcp-js';

import getBracketTool from './tools/get-bracket';
import getScheduleTool from './tools/get-schedule';
import getStandingsTool from './tools/get-standings';
import listTeamsTool from './tools/list-teams';

// PUBLIC server: no auth. Every tool reads only data that is already public on
// the website, through the `anon` Supabase role (RLS applies). Never add
// per-user, admin, or service-role capable tools here.
export default defineMcp({
  name: '717rec-public',
  title: '717rec League (public)',
  version: '0.1.0',
  instructions:
    'Read-only public data for the 717rec cornhole league: teams, standings, schedule, and live playoff brackets. No authentication required. Personal and admin tools live on the authenticated 717rec MCP server.',
  tools: [listTeamsTool, getStandingsTool, getScheduleTool, getBracketTool],
});
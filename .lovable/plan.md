## Goal

Add a committed `.mcp.json` at the repository root so a fresh Claude Code Web session auto-discovers the 717rec MCP server.

## File to create

`.mcp.json` (repo root):

```json
{
  "mcpServers": {
    "717rec": {
      "type": "http",
      "url": "https://wcitdamvochthvxvtxyb.supabase.co/functions/v1/mcp"
    }
  }
}
```

That's the whole change — one new file, no code edits, no dependency changes.

## After it's committed

In a new Claude Code Web session:
1. Run `/mcp`.
2. Select **717rec** and approve the project MCP server.
3. Complete the Supabase OAuth sign-in through the 717rec consent screen.

The 401 you're seeing on a raw `curl` is expected — the endpoint requires an OAuth bearer token. `/mcp` is what walks you through getting one.

## If `/mcp` never offers authentication

Check in Lovable: **717rec project → More → Agent integrations** and confirm the app is published, agent integrations are enabled, the MCP URL matches, and access is set to Sign-in enabled.

## Out of scope

No changes to the MCP server itself, tools, `vite.config.ts`, or the consent page — everything server-side is already deployed from the previous turn.

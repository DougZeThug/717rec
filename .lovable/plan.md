

## Fix Build Error: Remove Non-Existent `tags` Column

The `messages` table does not have a `tags` column, but two places reference it:

1. **`src/hooks/message-board/useMessageApi.ts` line 39** — the `.select()` string includes `tags`, causing the TS2352 build error
2. **`src/types/reactions.ts` line 25** — the `Message` interface declares `tags?: string[]`

No code in the project actually reads `.tags` from a message, so both references are dead weight.

### Changes

| File | Change |
|---|---|
| `src/hooks/message-board/useMessageApi.ts` (line 39) | Remove `tags` from the select string: `'id, content, created_at, username, team_name, user_id, team_id, category, updated_at, is_edited'` |
| `src/types/reactions.ts` (line 25) | Remove `tags?: string[];` from the `Message` interface |

Zero runtime behavior change — just aligning types with the actual database schema.


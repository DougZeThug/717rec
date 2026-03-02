

## Finalize Recreational Winter 1 2026 Bracket

**Bracket ID:** `29a823d8-47b3-489c-a9f1-ebc6586d9baf`

### Team IDs

| Team | ID |
|---|---|
| The Cornholy Trinity | `34b1dacf-0c30-4a4c-8228-432701868f34` |
| Here for Fireball | `c577e0f9-6700-4220-a902-b368ca915bbd` |
| On a Mission | `00def929-de16-4f59-933f-ae0247b04358` |
| Double Trouble | `31e0e752-e0fc-4bd1-892f-3b7123ad72b7` |
| Sack to the Future | `92e9f091-82f2-446d-8990-576c89a120e1` |
| Corn Kitties | `ea3b15e7-8bc7-467c-85fc-7f91e89742a1` |

### 5 UPDATEs on existing rows

| Row ID | Type | Round | Pos | Result | Notes |
|---|---|---|---|---|---|
| `9da09b98` | winners | 2 | 1 | On a Mission 0 – Here for Fireball 2 → HfF wins | Set scores/winner/loser |
| `6e9ace9a` | winners | 2 | 2 | Double Trouble 0 – Cornholy Trinity 2 → CT wins | Set scores/winner/loser |
| `6a6ddb74` | winners | 3 | 1 | Here for Fireball 0 – Cornholy Trinity 2 → CT wins | pending → completed |
| `7edc89b2` | losers | 2 | 1 | On a Mission 2 – Sack to the Future 0 → OaM wins | Fix team2_id, pending → completed |
| `64fe17e9` | losers | 2 | 2 | Double Trouble 2 – Corn Kitties 0 → DT wins | Fix team2_id, pending → completed |

### 3 INSERTs for new rounds

| Type | Round | Pos | Result |
|---|---|---|---|
| losers | 3 | 1 | On a Mission 2 – Double Trouble 0 → On a Mission wins |
| losers | 4 | 1 | Here for Fireball 1 – On a Mission 2 → On a Mission wins |
| winners | 4 | 1 | Cornholy Trinity 2 – On a Mission 0 → Cornholy Trinity wins (Grand Final) |

### Champion metadata
Set `wb_champion_id` = The Cornholy Trinity (`34b1dacf`), `state` = `'completed'` on brackets row.

### File Changes
None — purely a data migration.




## Finalize Intermediate Winter 1 2026 Bracket

All data is resolved. Single migration with 5 updates, 3 inserts, and champion metadata.

### 5 UPDATEs on existing rows

| Row ID | Type | Round | Pos | Result |
|---|---|---|---|---|
| `8b048a1a` | winners | 2 | 1 | Miracle @ Marion 1 – Wrong Hole 2 → Wrong Hole wins |
| `d6a9fa1f` | winners | 2 | 2 | Buttery Nips 1 – Bumbleweed 2 → Bumbleweed wins |
| `9f4e8b30` | winners | 3 | 1 | Wrong Hole 0 – Bumbleweed 2 → Bumbleweed wins |
| `3689c92b` | losers | 2 | 1 | Miracle @ Marion 1 – Happy Valley 2 → Happy Valley wins (also fixes team2_id) |
| `4dfe4167` | losers | 2 | 2 | Buttery Nips 2 – Smooth Sliders 0 → Buttery Nips wins (also fixes team2_id) |

### 3 INSERTs for new rounds

| Type | Round | Pos | Result |
|---|---|---|---|
| losers | 3 | 1 | Happy Valley 0 – Buttery Nips 2 → Buttery Nips wins |
| losers | 4 | 1 | Wrong Hole 0 – Buttery Nips 2 → Buttery Nips wins |
| winners | 4 | 1 | Bumbleweed 2 – Buttery Nips 1 → Bumbleweed wins (Grand Final) |

### Champion metadata
Set `wb_champion_id` = Bumbleweed, `state` = `'completed'` on brackets row.

### File Changes
None — purely a data migration.


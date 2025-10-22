# Brackets Manager Schema Documentation

## Overview

This document describes the database schema used for the `brackets-manager` integration in our Supabase backend. The schema follows the standard `brackets-manager` SQL structure with additional customizations for our application.

## Schema Architecture

The bracket system uses 6 core tables that maintain a hierarchical relationship:

```
brackets (tournament)
  └─> stage
       └─> group
            └─> round
                 └─> match
                      └─> match_game
  └─> participant
```

## Table Definitions

### 1. `stage`

Represents a stage in the tournament (e.g., "Main Stage", "Finals").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PRIMARY KEY, AUTO INCREMENT | Unique identifier |
| `tournament_id` | uuid | NOT NULL, FK → brackets(id) | Reference to parent bracket |
| `name` | text | NOT NULL | Stage name |
| `type` | text | NOT NULL | Stage type (single_elimination, double_elimination) |
| `number` | integer | NOT NULL | Stage number in sequence |
| `settings` | jsonb | DEFAULT '{}' | Additional stage configuration |

**Indexes:**
- `idx_stage_tournament` on `tournament_id`

**Foreign Keys:**
- `fk_stage_tournament`: `tournament_id` → `brackets(id)` ON DELETE CASCADE

---

### 2. `group`

Represents a group within a stage (used for round-robin or group stages).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PRIMARY KEY, AUTO INCREMENT | Unique identifier |
| `stage_id` | integer | NOT NULL, FK → stage(id) | Reference to parent stage |
| `number` | integer | NOT NULL | Group number in sequence |
| `name` | text | NULL | Optional group name |

**Indexes:**
- `idx_group_stage` on `stage_id`

**Foreign Keys:**
- `fk_group_stage`: `stage_id` → `stage(id)` ON DELETE CASCADE

---

### 3. `round`

Represents a round within a group (e.g., "Quarterfinals", "Semifinals").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PRIMARY KEY, AUTO INCREMENT | Unique identifier |
| `group_id` | integer | NOT NULL, FK → group(id) | Reference to parent group |
| `stage_id` | integer | NOT NULL, FK → stage(id) | Denormalized reference to stage for performance |
| `number` | integer | NOT NULL | Round number in sequence |
| `name` | text | NULL | Optional round name |

**Indexes:**
- `idx_round_group` on `group_id`
- `idx_round_stage_id` on `stage_id`

**Foreign Keys:**
- `fk_round_group`: `group_id` → `group(id)` ON DELETE CASCADE
- `fk_round_stage`: `stage_id` → `stage(id)` ON DELETE CASCADE

**Note:** The `stage_id` column is denormalized for query performance. It duplicates information from the parent group but allows direct stage-level queries.

---

### 4. `match`

Represents an individual match between two opponents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PRIMARY KEY, AUTO INCREMENT | Unique identifier |
| `stage_id` | integer | NOT NULL, FK → stage(id) | Reference to stage |
| `group_id` | integer | NOT NULL, FK → group(id) | Reference to group |
| `round_id` | integer | NOT NULL, FK → round(id) | Reference to round |
| `number` | integer | NOT NULL | Match number within round |
| `status` | integer | NOT NULL, DEFAULT 1 | Match status (1=pending, 2=running, 3=waiting, 4=completed) |
| `opponent1_id` | integer | NULL | First opponent (participant ID or null for BYE) |
| `opponent2_id` | integer | NULL | Second opponent (participant ID or null for BYE) |
| `opponent1_score` | integer | NULL | First opponent's score |
| `opponent2_score` | integer | NULL | Second opponent's score |
| `opponent1_result` | text | NULL | First opponent's result (win/loss/draw) |
| `opponent2_result` | text | NULL | Second opponent's result (win/loss/draw) |
| `child_count` | integer | NOT NULL, DEFAULT 0 | Number of child matches feeding into this match |

**Indexes:**
- `idx_match_stage` on `stage_id`
- `idx_match_round` on `round_id`

**Foreign Keys:**
- `fk_match_stage`: `stage_id` → `stage(id)` ON DELETE CASCADE
- `fk_match_group`: `group_id` → `group(id)` ON DELETE CASCADE
- `fk_match_round`: `round_id` → `round(id)` ON DELETE CASCADE

**Status Values:**
1. `LOCKED` (1) - Match not yet ready
2. `READY` (2) - Match ready to be played
3. `RUNNING` (3) - Match in progress
4. `COMPLETED` (4) - Match finished

---

### 5. `match_game`

Represents individual games within a best-of-N match.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PRIMARY KEY, AUTO INCREMENT | Unique identifier |
| `match_id` | integer | NOT NULL, FK → match(id) | Reference to parent match |
| `number` | integer | NOT NULL | Game number within match |
| `opponent1_score` | integer | NULL | First opponent's score in this game |
| `opponent2_score` | integer | NULL | Second opponent's score in this game |
| `status` | integer | NOT NULL, DEFAULT 1 | Game status (same as match status) |

**Indexes:**
- `idx_match_game_match` on `match_id`

**Foreign Keys:**
- `fk_match_game_match`: `match_id` → `match(id)` ON DELETE CASCADE

---

### 6. `participant`

Represents a team/player participating in the bracket.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PRIMARY KEY, AUTO INCREMENT | Unique identifier for participant |
| `tournament_id` | uuid | NOT NULL, FK → brackets(id) | Reference to bracket |
| `name` | text | NOT NULL | Participant name (team name) |

**Indexes:**
- `idx_participant_tournament` on `tournament_id`

**Foreign Keys:**
- `fk_participant_tournament`: `tournament_id` → `brackets(id)` ON DELETE CASCADE

---

## Foreign Key Cascade Behavior

All foreign keys use `ON DELETE CASCADE` to ensure data integrity:

- Deleting a **bracket** automatically deletes all stages and participants
- Deleting a **stage** automatically deletes all groups, rounds, and matches
- Deleting a **group** automatically deletes all rounds
- Deleting a **round** automatically deletes all matches
- Deleting a **match** automatically deletes all match_games

This ensures referential integrity and prevents orphaned records.

---

## Row Level Security (RLS) Policies

All tables have RLS enabled with the following policies:

### Read Access (SELECT)
- **Public**: All users can view all bracket data
- Policy: `Public read <table_name>`

### Write Access (INSERT/UPDATE/DELETE)
- **Admins Only**: Only authenticated admin users can modify bracket data
- Policy: `Admin write <table_name>`
- Uses function: `current_user_is_admin()`

---

## Integration with `brackets-manager`

### Storage Adapter

The `SupabaseSqlStorage` class (`src/services/brackets/manager/SupabaseSqlStorage.ts`) implements the `CrudInterface` from `brackets-manager` and translates operations to Supabase queries.

### Key Features

1. **Direct SQL Table Storage**: All bracket data is stored in Supabase tables, not in-memory
2. **Real-time Sync**: Changes are immediately persisted to the database
3. **Type Safety**: Full TypeScript support with generated Supabase types
4. **Performance**: Optimized indexes on all foreign key columns

### Usage Example

```typescript
import { BracketManagerService } from '@/services/brackets/manager/BracketManagerService';

const service = new BracketManagerService();

// Create a bracket
await service.createBracket({
  bracketId: 'my-bracket-uuid',
  format: 'single_elimination',
  teams: [
    { teamId: 'team1', teamName: 'Team 1', seed: 1 },
    { teamId: 'team2', teamName: 'Team 2', seed: 2 },
    // ... more teams
  ],
});

// Update a match
await service.updateMatch({
  matchId: 123,
  team1Score: 2,
  team2Score: 1,
});
```

---

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| Initial setup | 2025-01-22 | Created base tables for brackets-manager |
| Add `round.stage_id` | 2025-10-22 | Added denormalized stage_id to round table |
| Add `match.child_count` | 2025-10-22 | Added child_count tracking to match table |
| Add FK constraints | 2025-10-22 | Added all foreign key constraints with CASCADE |

---

## Performance Considerations

### Indexes

All foreign key columns have indexes for optimal query performance:
- Stage lookups by tournament
- Group lookups by stage
- Round lookups by group/stage
- Match lookups by stage/round
- Match game lookups by match
- Participant lookups by tournament

### Denormalization

The `round.stage_id` column is intentionally denormalized (duplicates data from parent group) to allow fast queries that filter rounds by stage without joining through groups.

---

## Testing

Comprehensive test coverage is provided in `tests/bracketManagerSchema.test.ts`:

- ✅ Schema verification for all 6 tables
- ✅ Single elimination bracket creation (4, 8, 16 teams)
- ✅ Double elimination bracket creation (4, 8 teams)
- ✅ Edge cases (odd number of teams, BYE handling)
- ✅ Match updates and progression
- ✅ Foreign key cascade behavior

Run tests with: `npm test tests/bracketManagerSchema.test.ts`

---

## Troubleshooting

### Common Issues

**Error: "column X does not exist"**
- Ensure all migrations have been run
- Check that `round.stage_id` and `match.child_count` exist

**Error: "violates foreign key constraint"**
- Ensure parent records exist before creating child records
- Verify UUIDs/IDs are valid

**Error: "new row violates row-level security policy"**
- Ensure user is authenticated and has admin privileges
- Check that `current_user_is_admin()` returns true

---

## References

- [brackets-manager GitHub](https://github.com/Drarig29/brackets-manager.js)
- [brackets-storage SQL Schema](https://github.com/Drarig29/brackets-storage/tree/master/brackets-sql-db)
- [Supabase Documentation](https://supabase.com/docs)

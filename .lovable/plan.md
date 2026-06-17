## Step 5 — One-off data fix for Intermediate Spring 2026 Grand Final

### What I found in the database

I queried the affected bracket directly. The Grand Final row already has both team IDs stored, but the row's `status` is `1` (Locked) instead of `2` (Ready). The bracket UI (brackets-manager renderer) treats Locked matches as "not yet populated" and renders them as `-` / `-`, which is exactly what your screenshot shows. So the row looks populated to the DB but blank to the UI.

Flipping `status` from `1` → `2` makes the renderer display the team names AND makes the match playable/editable. One row, one update.

- **Bracket:** "Intermediate Spring 2026" (`bracket id = 0beb6968-3424-42b1-bd4c-6941386bea51`, `stage_id = 118`)
- **WB Final** (group 1, round 4, match `id = 2644`): Smooth Sliders (participant `1407`) beat Tom & Tom 2–0 → `status = 4` ✅
- **LB Final** (group 2, round 6, match `id = 2658`): The Triple Nipple (participant `1409`) beat Tom & Tom 2–0 → `status = 4` ✅
- **Grand Final – round 1** (group 3, round 1, match `id = 2659`): `opponent1_id = 1407` (Smooth Sliders), `opponent2_id = 1409` (The Triple Nipple), `status = 1` (Locked) → renders blank ❌
- **Grand Final – reset** (group 3, round 2, match `id = 2660`): empty, `status = 0` — correct; only populates if Triple Nipple wins GF round 1.

### SQL snippet to run from the admin SQL editor

```sql
-- Intermediate Spring 2026 — unlock the Grand Final so names show and it becomes playable.
-- Match 2659 = Grand Final round 1 (stage 118, group 338, round 1177)
-- opponent1 = 1407 (Smooth Sliders, WB Final winner)
-- opponent2 = 1409 (The Triple Nipple, LB Final winner)
-- status: 1 (Locked) -> 2 (Ready)

UPDATE public.match
SET
  opponent1_id = 1407,
  opponent2_id = 1409,
  status       = 2
WHERE id = 2659
  AND stage_id = 118
  AND group_id = 338
  AND round_id = 1177;

-- Verify (expect status=2 and both opponent IDs set)
SELECT id, group_id, round_id, status, opponent1_id, opponent2_id
FROM public.match
WHERE id = 2659;
```

Re-running is safe: opponent IDs already match the values being set, so the statement is idempotent.

### How to verify after running

1. Hard-refresh the Intermediate Spring 2026 playoff bracket page.
2. The Grand Final card should now show **Smooth Sliders** vs **The Triple Nipple** (instead of `-` / `-`) and be editable/scorable.
3. The reset match below it stays empty until/unless The Triple Nipple wins GF round 1.

### Why the UI was blank (so you can spot this pattern next time)

In brackets-manager, match `status` controls rendering as well as gating:
- `0` = Locked (no opponents yet) — renders blank
- `1` = Waiting (opponents known but at least one upstream not final) — also renders blank/placeholder
- `2` = Ready — opponents shown, match playable
- `3` = Running, `4` = Completed, `5` = Archived

The auto-repair code shipped in the previous steps writes `status = 2` whenever both GF slots get filled. This one row predates that fix, hence the manual nudge.

### Scope / safety notes

- Touches exactly one row in `public.match`. No standings, teams, or other brackets are affected.
- Not a migration — this is data, not schema. Run it from the admin SQL editor.
- Run only after the code fix is live so the stuck state doesn't recur for future brackets.

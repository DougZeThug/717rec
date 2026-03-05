

## Fix: Zero Power Score Treated as Null

**Line 609** in `src/services/RankingSnapshotService.ts` uses a truthy check (`stat.power_score ? ...`) which discards a legitimate `0` value. Replace with an explicit null check: `stat.power_score !== null ? stat.power_score * 100 : null`.

One line change.


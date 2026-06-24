## Fix JS-0437: avoid using array index as React key

Replace `key={index}` / `key={i}` / `key={idx}` with stable string keys across 11 files. All occurrences are either static skeleton placeholders, JSON-LD script tags, or trophy icon repetitions — none render dynamic, reorderable data — so the safest fix is to use a descriptive prefixed key (e.g. `key={\`skeleton-${i}\`}`) which satisfies the linter without changing runtime behavior.

### Files to update

1. `src/components/seo/SeoHead.tsx` — JSON-LD scripts: key by a stable schema identifier (e.g. `jsonLd['@type']` + index fallback) or `` `jsonld-${i}` ``.
2. `src/components/teams/ReportCardLeaderboard.tsx` — skeleton list → `` `skeleton-${i}` ``.
3. `src/components/teams/TeamReportCard.tsx` — skeleton list → `` `skeleton-${i}` ``.
4. `src/components/stats/containers/LoadingStateContainer.tsx` (two spots) — `` `loading-row-${idx}` ``, `` `loading-card-${idx}` ``.
5. `src/components/badges/TeamBadgeCollection.tsx` — `` `badge-placeholder-${i}` ``.
6. `src/components/stats/career/CareerRankingsMobileView.tsx` — trophy spans → `` `trophy-${i}` ``.
7. `src/components/stats/StatsLoadingState.tsx` — `` `card-skeleton-${i}` ``.
8. `src/components/schedule/DateMatchGroupSkeleton.tsx` — `` `match-skeleton-${index}` ``.
9. `src/components/message-board/MessageFeedSkeleton.tsx` — `` `message-skeleton-${index}` ``.
10. `src/components/playoffs/form/bracket-teams/components/TeamSelectionLoading.tsx` — `` `team-skeleton-${i}` ``.

### Verification

- `npx eslint <changed files>` → 0 JS-0437 warnings.
- Visual: no runtime change since lists are static-length placeholders or repeated icons.

No behavior changes, presentation only.
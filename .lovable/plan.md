

## Problem

The champions hero card metadata still contains Fall 2025 data with old division names ("Intermediate 1", "Intermediate 2") that no longer exist. Current season (Winter 2026) has different divisions (just "Competitive", "Intermediate", "Recreational"). The `ChampionsEditor` shows current divisions but doesn't clean up stale keys from old seasons, so the preview renders all 5 entries.

## Fix

**File: `src/components/admin/hero-cards/form-sections/ChampionsEditor.tsx`**

Add an effect that syncs `metadata.champions` keys with current visible divisions when the editor mounts or divisions change. Any champion entries whose key doesn't match a current `display_division` get removed automatically.

```typescript
// After computing visibleDivisions and parsing metadata:
useEffect(() => {
  const validDivisionNames = new Set(visibleDivisions.map(d => d.display_division));
  const currentChampions = metadata.champions || {};
  const staleKeys = Object.keys(currentChampions).filter(k => !validDivisionNames.has(k));
  
  if (staleKeys.length > 0 && visibleDivisions.length > 0) {
    const cleaned = { ...currentChampions };
    staleKeys.forEach(k => delete cleaned[k]);
    const newMetadata = { ...metadata, champions: cleaned };
    onChange('metadata', JSON.stringify(newMetadata, null, 2));
  }
}, [visibleDivisions]);
```

This ensures that when an admin opens the champions card editor, any leftover division keys from a previous season are automatically stripped, and the preview immediately reflects only the current season's divisions.

**Single file change**: `src/components/admin/hero-cards/form-sections/ChampionsEditor.tsx`


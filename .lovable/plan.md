

## Plan: Resolve `package.json` merge conflict

### Why
`package.json` contains an unresolved Git merge conflict between two branches:
- `codex/add-license-and-versioning-to-project` added `"license": "MIT"`
- `main` added the `"overrides"` block (the npm cache fix from earlier)

The `<<<<<<<`, `=======`, `>>>>>>>` markers make the JSON invalid, breaking the build.

### Fix
Keep **both** changes — they don't conflict semantically. Replace the conflict block with:

```json
  },
  "license": "MIT",
  "overrides": {
    "sucrase": "3.32.0",
    "glob": "7.1.6"
  }
}
```

### Files touched
- `package.json` (remove conflict markers, merge both additions)

### Verification
- File parses as valid JSON
- `bun install` runs without the earlier 404 errors (overrides preserved)
- License field present for the versioning branch's intent

### Rollback
Revert the file. One step.


## Problem
The `MessageContent` component builds React keys from raw line text plus an occurrence counter using `#` as a delimiter. Since `#` can appear in user content, two different lines can generate the same key. Example:
- `"hello"` (first occurrence) → key `line:hello`
- `"hello#1"` (first occurrence) → key `line:hello#1`
- `"hello"` (second occurrence) → key `line:hello#1` ← COLLISION

## Fix
Change the key delimiter to a sequence that cannot collide with content: `::occurrence:`.

## Files to change

### 1. `src/components/message-board/message-item/MessageContent.tsx`
Replace line 24:
```
const key = occurrence === 0 ? `line:${line}` : `line:${line}#${occurrence}`;
```
with:
```
const key = occurrence === 0 ? `line:${line}` : `line:${line}::occurrence:${occurrence}`;
```

### 2. `src/components/message-board/__tests__/MessageContent.key-collision.test.tsx` (new)
Add a test that renders `hello\nhello#1\nhello` and asserts zero console warnings about duplicate keys.

## Verification
Run `npm run test:file -- src/components/message-board/__tests__/MessageContent.key-collision.test.tsx`

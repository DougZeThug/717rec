
# Import Guidelines for Bracket Teams Module

## Core Principle
**Always import core types directly from their source to avoid circular dependencies.**

## Import Patterns

### ✅ Correct Patterns

```typescript
// Import core types directly from main types
import { Division, Team } from '@/types';
import { ProcessedTeam, BracketFormDataResult } from '../types';

// Import React and hooks
import React from 'react';
import { useState, useCallback } from 'react';

// Import utilities from their modules
import { teamDataHelpers } from '../utils';
```

### ❌ Avoid These Patterns

```typescript
// DON'T re-export core types in module-specific type files
export type { Division } from '@/types'; // Creates circular imports

// DON'T import core types from module re-exports
import { Division } from '../types'; // Should be from '@/types'

// DON'T use dynamic imports in type definitions unless necessary
divisions?: import('@/types').Division[]; // Should be direct import
```

## Type Organization

### Core Types (`@/types`)
- `Team` - Base team interface
- `Division` - Division interface  
- `Match` - Match interface
- Other application-wide types

### Module Types (`./types`)
- `ProcessedTeam` - Extended team for bracket processing
- `BracketFormDataResult` - Module-specific data structures
- `ValidationProgress` - Module-specific interfaces

## Prevention Checklist

Before adding new exports to `index.ts`:
- [ ] Is this a core type? → Import from `@/types`
- [ ] Is this module-specific? → Export from `./types`
- [ ] Does this create a circular dependency? → Use direct imports
- [ ] Are all imports explicit and traceable? → Avoid re-exports of core types

## Build Error Prevention

1. **Always test imports locally** before exporting
2. **Keep core and module types separate**
3. **Document any exceptions to these patterns**
4. **Regular build validation** to catch circular dependencies early

import { describe, expect, it } from 'vitest';

import type { WinterGlyphName } from '../types';
import { getWinterGlyph, SnowflakeSparkle } from '../winterGlyphRegistry';

describe('getWinterGlyph', () => {
  it('returns the glyph component for a known name', () => {
    expect(getWinterGlyph('snowflake-sparkle')).toBe(SnowflakeSparkle);
    expect(getWinterGlyph('snowflake')).toBeDefined();
  });

  it('returns nothing for a name that is not in the registry', () => {
    expect(getWinterGlyph('not-a-glyph' as WinterGlyphName)).toBeUndefined();
  });
});

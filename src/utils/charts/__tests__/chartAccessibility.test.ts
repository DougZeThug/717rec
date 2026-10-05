import { describe, expect, it } from 'vitest';

import { describeChart } from '../chartAccessibility';

describe('describeChart', () => {
  it('returns just the intro when there is nothing to list', () => {
    expect(describeChart('Bar chart of wins.', [])).toBe('Bar chart of wins.');
  });

  it('lists every item when there are few', () => {
    expect(describeChart('Bar chart of wins.', ['Alpha 5', 'Bravo 3'])).toBe(
      'Bar chart of wins. Alpha 5; Bravo 3.'
    );
  });

  it('cuts a long list and says how many were left out', () => {
    const items = Array.from({ length: 13 }, (_, i) => `Team ${i + 1}`);
    const label = describeChart('Chart.', items);

    expect(label).toContain('Team 10');
    expect(label).not.toContain('Team 11');
    expect(label.endsWith('and 3 more.')).toBe(true);
  });

  it('honours a different limit', () => {
    expect(describeChart('Chart.', ['a', 'b', 'c'], 2)).toBe('Chart. a; b; and 1 more.');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { exportCareerStatsToCSV } from '@/utils/exportUtils';

/**
 * Captures what the export would have downloaded.
 *
 * jsdom has no object-URL support and no real download, so the blob handed to
 * `URL.createObjectURL` is the only place the finished CSV can be read.
 */
const captureCsv = () => {
  const blobs: Blob[] = [];
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob) => {
      blobs.push(blob);
      return 'blob:captured';
    },
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  return async () => await blobs[0].text();
};

const ranking = (overrides: Record<string, unknown> = {}) =>
  ({
    teamName: 'Baggers',
    divisionName: 'Premier',
    careerMatchWins: 8,
    careerMatchLosses: 2,
    careerWinPercentage: 0.8,
    careerGameWins: 18,
    careerGameLosses: 6,
    careerGameWinPercentage: 0.75,
    careerPlayoffWins: 3,
    careerPlayoffLosses: 1,
    championships: 1,
    runnerUps: 0,
    careerPowerScore: 71.25,
    ...overrides,
  }) as Parameters<typeof exportCareerStatsToCSV>[0][number];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportCareerStatsToCSV', () => {
  /**
   * The Division column reads `divisionName`, which lives on the shared
   * useCareerRankings row. Four of that hook's five consumers never touch the
   * field, so it reads as removable — and dropping it would empty this column
   * with no type error anywhere. This is the guard against that.
   */
  it('carries the division through to the CSV', async () => {
    const readCsv = captureCsv();

    exportCareerStatsToCSV([ranking()]);

    const csv = await readCsv();
    const [header, row] = csv.split('\n');
    expect(header.split(',')[2]).toBe('Division');
    expect(row.split(',')[2]).toBe('Premier');
  });

  it('leaves the division blank rather than printing undefined', async () => {
    const readCsv = captureCsv();

    exportCareerStatsToCSV([ranking({ divisionName: null })]);

    const csv = await readCsv();
    expect(csv.split('\n')[1].split(',')[2]).toBe('');
  });
});

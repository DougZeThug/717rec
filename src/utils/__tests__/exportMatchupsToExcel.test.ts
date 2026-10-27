import ExcelJS from 'exceljs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SeasonOpponentData } from '@/hooks/useSeasonOpponentHistory';
import { exportMatchupsToExcel } from '@/utils/exportMatchupsToExcel';

const data = {
  seasonName: 'Fall 2026',
  teams: [
    {
      teamName: '=Evil Team',
      divisionName: 'Competitive',
      uniqueOpponentCount: 1,
      totalMatches: 2,
      opponents: [
        {
          opponentName: 'Bag Lords',
          opponentDivision: null,
          matchCount: 2,
          wins: 1,
          losses: 1,
        },
      ],
    },
  ],
} as unknown as SeasonOpponentData;

describe('exportMatchupsToExcel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads a real two-sheet .xlsx with formulas neutralized', async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((value: Blob | MediaSource) => {
      blob = value as Blob;
      return 'blob:test';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    await exportMatchupsToExcel(data);

    expect(click).toHaveBeenCalledTimes(1);
    expect(blob?.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const workbook = new ExcelJS.Workbook();
    expect(blob).toBeDefined();
    await workbook.xlsx.load(await (blob as Blob).arrayBuffer());

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Team Summary',
      'Matchup Details',
    ]);
    expect(workbook.getWorksheet('Team Summary')?.getCell('A2').value).toBe("'=Evil Team");
    expect(workbook.getWorksheet('Matchup Details')?.getCell('H2').value).toBe('1-1');
    expect(workbook.getWorksheet('Matchup Details')?.getCell('D2').value).toBe('—');
  });

  it('names the file with an .xlsx extension', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const append = vi.spyOn(document.body, 'appendChild');

    await exportMatchupsToExcel(data);

    const link = append.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.download).toMatch(/^Fall_2026_Matchups_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});

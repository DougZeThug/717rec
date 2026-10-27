import { SeasonOpponentData } from '@/hooks/useSeasonOpponentHistory';
import { neutralizeFormula } from '@/utils/spreadsheetSafe';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type Cell = string | number;

const safeRow = (cells: Cell[]): Cell[] => cells.map(neutralizeFormula);

export const exportMatchupsToExcel = async (data: SeasonOpponentData): Promise<void> => {
  // exceljs is large, so it loads only when an admin clicks Export.
  const { default: ExcelJS } = await import('exceljs');

  const workbook = new ExcelJS.Workbook();

  const addSheet = (name: string, header: string[], rows: Cell[][]) => {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(header).font = { bold: true };
    rows.forEach((row) => sheet.addRow(safeRow(row)));
    sheet.columns.forEach((column) => {
      column.width = 16;
    });
  };

  addSheet(
    'Team Summary',
    ['Team', 'Division', '# Opponents', '# Matches'],
    data.teams.map((team) => [
      team.teamName,
      team.divisionName || '—',
      team.uniqueOpponentCount,
      team.totalMatches,
    ])
  );

  addSheet(
    'Matchup Details',
    ['Team', 'Division', 'Opponent', 'Opp. Division', 'Matches', 'Wins', 'Losses', 'Record'],
    data.teams.flatMap((team) =>
      team.opponents.map((opp) => [
        team.teamName,
        team.divisionName || '—',
        opp.opponentName,
        opp.opponentDivision || '—',
        opp.matchCount,
        opp.wins,
        opp.losses,
        `${opp.wins}-${opp.losses}`,
      ])
    )
  );

  const date = new Date().toISOString().split('T')[0];
  const safeName = data.seasonName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${safeName}_Matchups_${date}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

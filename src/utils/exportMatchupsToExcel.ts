import ExcelJS from 'exceljs';

import { SeasonOpponentData } from '@/hooks/useSeasonOpponentHistory';

export const exportMatchupsToExcel = async (data: SeasonOpponentData): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '717 Rec League';
  workbook.created = new Date();

  // Sheet 1: Team Summary
  const summarySheet = workbook.addWorksheet('Team Summary');
  summarySheet.columns = [
    { header: 'Team', key: 'team', width: 25 },
    { header: 'Division', key: 'division', width: 15 },
    { header: '# Opponents', key: 'opponents', width: 12 },
    { header: '# Matches', key: 'matches', width: 12 },
  ];

  // Style header row
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  data.teams.forEach((team) => {
    summarySheet.addRow({
      team: team.teamName,
      division: team.divisionName || '—',
      opponents: team.uniqueOpponentCount,
      matches: team.totalMatches,
    });
  });

  // Sheet 2: Matchup Details
  const detailsSheet = workbook.addWorksheet('Matchup Details');
  detailsSheet.columns = [
    { header: 'Team', key: 'team', width: 25 },
    { header: 'Division', key: 'division', width: 15 },
    { header: 'Opponent', key: 'opponent', width: 25 },
    { header: 'Opp. Division', key: 'oppDivision', width: 15 },
    { header: 'Matches', key: 'matches', width: 10 },
    { header: 'Wins', key: 'wins', width: 8 },
    { header: 'Losses', key: 'losses', width: 8 },
    { header: 'Record', key: 'record', width: 10 },
  ];

  // Style header row
  detailsSheet.getRow(1).font = { bold: true };
  detailsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  data.teams.forEach((team) => {
    team.opponents.forEach((opp) => {
      detailsSheet.addRow({
        team: team.teamName,
        division: team.divisionName || '—',
        opponent: opp.opponentName,
        oppDivision: opp.opponentDivision || '—',
        matches: opp.matchCount,
        wins: opp.wins,
        losses: opp.losses,
        record: `${opp.wins}-${opp.losses}`,
      });
    });
  });

  // Generate filename with season name and date
  const date = new Date().toISOString().split('T')[0];
  const safeName = data.seasonName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${safeName}_Matchups_${date}.xlsx`;

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

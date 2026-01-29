import * as XLSX from 'xlsx';

import { SeasonOpponentData } from '@/hooks/useSeasonOpponentHistory';

export const exportMatchupsToExcel = (data: SeasonOpponentData): void => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Team Summary
  const summaryData = data.teams.map((team) => ({
    Team: team.teamName,
    Division: team.divisionName || '—',
    '# Opponents': team.uniqueOpponentCount,
    '# Matches': team.totalMatches,
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);

  // Set column widths
  summarySheet['!cols'] = [
    { wch: 25 }, // Team
    { wch: 15 }, // Division
    { wch: 12 }, // # Opponents
    { wch: 12 }, // # Matches
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Team Summary');

  // Sheet 2: Matchup Details
  const detailsData: Array<Record<string, string | number>> = [];
  data.teams.forEach((team) => {
    team.opponents.forEach((opp) => {
      detailsData.push({
        Team: team.teamName,
        Division: team.divisionName || '—',
        Opponent: opp.opponentName,
        'Opp. Division': opp.opponentDivision || '—',
        Matches: opp.matchCount,
        Wins: opp.wins,
        Losses: opp.losses,
        Record: `${opp.wins}-${opp.losses}`,
      });
    });
  });
  const detailsSheet = XLSX.utils.json_to_sheet(detailsData);

  detailsSheet['!cols'] = [
    { wch: 25 }, // Team
    { wch: 15 }, // Division
    { wch: 25 }, // Opponent
    { wch: 15 }, // Opp. Division
    { wch: 10 }, // Matches
    { wch: 8 }, // Wins
    { wch: 8 }, // Losses
    { wch: 10 }, // Record
  ];
  XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Matchup Details');

  // Generate filename with season name and date
  const date = new Date().toISOString().split('T')[0];
  const safeName = data.seasonName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${safeName}_Matchups_${date}.xlsx`;

  // Trigger download
  XLSX.writeFile(workbook, filename);
};

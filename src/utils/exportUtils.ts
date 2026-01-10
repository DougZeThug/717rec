/**
 * Escape a value for CSV format
 */
const escapeCSVValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

/**
 * Convert an array of objects to CSV string
 */
export const arrayToCSV = <T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string => {
  const headers = columns.map((col) => escapeCSVValue(col.header)).join(',');
  const rows = data.map((row) =>
    columns.map((col) => escapeCSVValue(row[col.key] as string | number | null)).join(',')
  );
  return [headers, ...rows].join('\n');
};

/**
 * Trigger a file download in the browser
 */
export const downloadFile = (
  content: string,
  filename: string,
  mimeType: string = 'text/csv'
): void => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export head-to-head records to CSV
 */
export const exportHeadToHeadToCSV = (
  records: Array<{
    opponent_name: string;
    wins: number;
    losses: number;
    win_pct: number;
    matches_played: number;
    game_wins: number;
    game_losses: number;
    last_played_at: string | null;
  }>,
  teamName: string
): void => {
  const columns = [
    { key: 'opponent_name' as const, header: 'Opponent' },
    { key: 'wins' as const, header: 'Wins' },
    { key: 'losses' as const, header: 'Losses' },
    { key: 'win_pct' as const, header: 'Win %' },
    { key: 'matches_played' as const, header: 'Matches Played' },
    { key: 'game_wins' as const, header: 'Game Wins' },
    { key: 'game_losses' as const, header: 'Game Losses' },
    { key: 'last_played_at' as const, header: 'Last Played' },
  ];

  const csv = arrayToCSV(records, columns);
  const date = new Date().toISOString().split('T')[0];
  const safeTeamName = teamName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${safeTeamName}_HeadToHead_${date}.csv`;

  downloadFile(csv, filename);
};

/**
 * Export current standings to CSV
 */
export const exportStandingsToCSV = (
  rankings: Array<{
    teamName: string;
    divisionName?: string | null;
    wins: number;
    losses: number;
    winPercentage: number;
    gamesWon: number;
    gamesLost: number;
    gameWinPercentage: number;
    powerScore: number;
    sos: number;
  }>
): void => {
  const data = rankings.map((r, index) => ({
    rank: index + 1,
    team: r.teamName,
    division: r.divisionName || '',
    record: `${r.wins}-${r.losses}`,
    win_pct: (r.winPercentage * 100).toFixed(1),
    game_record: `${r.gamesWon}-${r.gamesLost}`,
    game_win_pct: (r.gameWinPercentage * 100).toFixed(1),
    power_score: r.powerScore.toFixed(2),
    sos: r.sos.toFixed(3),
  }));

  const columns = [
    { key: 'rank' as const, header: 'Rank' },
    { key: 'team' as const, header: 'Team' },
    { key: 'division' as const, header: 'Division' },
    { key: 'record' as const, header: 'Record' },
    { key: 'win_pct' as const, header: 'Win %' },
    { key: 'game_record' as const, header: 'Game Record' },
    { key: 'game_win_pct' as const, header: 'Game Win %' },
    { key: 'power_score' as const, header: 'Power Score' },
    { key: 'sos' as const, header: 'SOS' },
  ];

  const csv = arrayToCSV(data, columns);
  const date = new Date().toISOString().split('T')[0];
  const filename = `Current_Standings_${date}.csv`;

  downloadFile(csv, filename);
};

/**
 * Export career statistics to CSV
 */
export const exportCareerStatsToCSV = (
  rankings: Array<{
    teamName: string;
    divisionName?: string | null;
    careerMatchWins: number;
    careerMatchLosses: number;
    careerWinPercentage: number;
    careerGameWins: number;
    careerGameLosses: number;
    careerGameWinPercentage: number;
    careerPlayoffWins: number;
    careerPlayoffLosses: number;
    championships: number;
    runnerUps: number;
    careerPowerScore: number;
  }>
): void => {
  const data = rankings.map((r, index) => ({
    rank: index + 1,
    team: r.teamName,
    division: r.divisionName || '',
    match_record: `${r.careerMatchWins}-${r.careerMatchLosses}`,
    match_win_pct: (r.careerWinPercentage * 100).toFixed(1),
    game_record: `${r.careerGameWins}-${r.careerGameLosses}`,
    game_win_pct: (r.careerGameWinPercentage * 100).toFixed(1),
    playoff_record: `${r.careerPlayoffWins}-${r.careerPlayoffLosses}`,
    championships: r.championships,
    runner_ups: r.runnerUps,
    career_power_score: r.careerPowerScore.toFixed(2),
  }));

  const columns = [
    { key: 'rank' as const, header: 'Rank' },
    { key: 'team' as const, header: 'Team' },
    { key: 'division' as const, header: 'Division' },
    { key: 'match_record' as const, header: 'Match Record' },
    { key: 'match_win_pct' as const, header: 'Match Win %' },
    { key: 'game_record' as const, header: 'Game Record' },
    { key: 'game_win_pct' as const, header: 'Game Win %' },
    { key: 'playoff_record' as const, header: 'Playoff Record' },
    { key: 'championships' as const, header: 'Championships' },
    { key: 'runner_ups' as const, header: 'Runner-Ups' },
    { key: 'career_power_score' as const, header: 'Career Power Score' },
  ];

  const csv = arrayToCSV(data, columns);
  const date = new Date().toISOString().split('T')[0];
  const filename = `Career_Statistics_${date}.csv`;

  downloadFile(csv, filename);
};

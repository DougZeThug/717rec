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
  const headers = columns.map(col => escapeCSVValue(col.header)).join(',');
  const rows = data.map(row => 
    columns.map(col => escapeCSVValue(row[col.key] as string | number | null)).join(',')
  );
  return [headers, ...rows].join('\n');
};

/**
 * Trigger a file download in the browser
 */
export const downloadFile = (content: string, filename: string, mimeType: string = 'text/csv'): void => {
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

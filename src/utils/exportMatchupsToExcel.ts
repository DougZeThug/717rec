import { SeasonOpponentData } from '@/hooks/useSeasonOpponentHistory';

const escapeHtml = (value: string | number): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const renderCell = (value: string | number, tag: 'td' | 'th' = 'td'): string =>
  `<${tag}>${escapeHtml(value)}</${tag}>`;

const renderRow = (cells: Array<string | number>, tag: 'td' | 'th' = 'td'): string =>
  `<tr>${cells.map((cell) => renderCell(cell, tag)).join('')}</tr>`;

export const exportMatchupsToExcel = async (data: SeasonOpponentData): Promise<void> => {
  const summaryRows = data.teams.map((team) =>
    renderRow([
      team.teamName,
      team.divisionName || '—',
      team.uniqueOpponentCount,
      team.totalMatches,
    ])
  );

  const detailRows = data.teams.flatMap((team) =>
    team.opponents.map((opp) =>
      renderRow([
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

  const workbookHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; margin-bottom: 24px; }
    th, td { border: 1px solid #999; padding: 6px 10px; }
    th { background: #e0e0e0; font-weight: 700; }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.seasonName)} Matchups</h1>
  <h2>Team Summary</h2>
  <table>
    <thead>${renderRow(['Team', 'Division', '# Opponents', '# Matches'], 'th')}</thead>
    <tbody>${summaryRows.join('')}</tbody>
  </table>
  <h2>Matchup Details</h2>
  <table>
    <thead>${renderRow(['Team', 'Division', 'Opponent', 'Opp. Division', 'Matches', 'Wins', 'Losses', 'Record'], 'th')}</thead>
    <tbody>${detailRows.join('')}</tbody>
  </table>
</body>
</html>`;

  const date = new Date().toISOString().split('T')[0];
  const safeName = data.seasonName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${safeName}_Matchups_${date}.xls`;

  const blob = new Blob([workbookHtml], {
    type: 'application/vnd.ms-excel;charset=utf-8',
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
